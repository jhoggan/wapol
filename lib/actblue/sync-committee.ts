import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const ACTBLUE_CSV_BASE = "https://secure.actblue.com/api/v1/csvs";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function basicAuthHeader(clientUuid: string, clientSecret: string) {
  const token = Buffer.from(`${clientUuid}:${clientSecret}`, "utf8").toString(
    "base64"
  );
  return `Basic ${token}`;
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    o[k.trim().toLowerCase()] = String(v ?? "").trim();
  }
  return o;
}

function cell(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function isTruthyCsv(val: string): boolean {
  if (!val) return false;
  const v = val.toLowerCase();
  return (
    v === "true" ||
    v === "yes" ||
    v === "1" ||
    v === "t" ||
    v === "y"
  );
}

function parsePaymentDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) return iso[0];
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return formatUtcDate(new Date(t));
  return null;
}

function parseAmount(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function paymentMethodFromRow(r: Record<string, string>): string {
  const card = cell(r, "card type");
  if (card) return card;
  if (isTruthyCsv(cell(r, "is paypal", "is_paypal"))) return "PayPal";
  if (isTruthyCsv(cell(r, "apple pay", "apple_pay"))) return "Apple Pay";
  return "Unknown";
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export type ActBlueSyncResult = {
  imported: number;
  skipped: number;
  logId: string;
};

export async function runActBlueSyncForCommittee(options: {
  supabase: SupabaseClient;
  committeeId: string;
}): Promise<ActBlueSyncResult> {
  const { supabase, committeeId } = options;

  const { data: com, error: comErr } = await supabase
    .from("committees")
    .select(
      "id, actblue_client_uuid, actblue_client_secret, actblue_last_synced_at"
    )
    .eq("id", committeeId)
    .maybeSingle();

  if (comErr || !com) {
    throw new Error(comErr?.message ?? "Committee not found");
  }

  const clientUuid = com.actblue_client_uuid?.trim();
  const clientSecret = com.actblue_client_secret?.trim();
  if (!clientUuid || !clientSecret) {
    throw new Error("ActBlue credentials are not configured for this committee");
  }

  const end = new Date();
  let rangeStart: Date;
  if (com.actblue_last_synced_at) {
    rangeStart = new Date(com.actblue_last_synced_at);
  } else {
    rangeStart = new Date(end);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 30);
  }

  let startStr = formatUtcDate(rangeStart);
  const endStr = formatUtcDate(end);
  if (startStr > endStr) {
    startStr = endStr;
  }

  const { data: logRow, error: logInsErr } = await supabase
    .from("actblue_sync_logs")
    .insert({
      committee_id: committeeId,
      status: "in_progress",
      date_range_start: startStr,
      date_range_end: endStr,
    })
    .select("id")
    .single();

  if (logInsErr || !logRow) {
    throw new Error(logInsErr?.message ?? "Failed to create sync log");
  }
  const logId = logRow.id;

  const failLog = async (message: string) => {
    await supabase
      .from("actblue_sync_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 2000),
      })
      .eq("id", logId);
  };

  try {
    const auth = basicAuthHeader(clientUuid, clientSecret);
    const createRes = await fetch(ACTBLUE_CSV_BASE, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        csv_type: "paid_contributions",
        date_range_start: startStr,
        date_range_end: endStr,
      }),
    });

    if (createRes.status !== 202 && !createRes.ok) {
      const text = await createRes.text();
      throw new Error(
        `ActBlue create CSV: HTTP ${createRes.status} ${text.slice(0, 500)}`
      );
    }

    const created = (await createRes.json()) as { id?: string };
    const csvJobId = created.id;
    if (!csvJobId) {
      throw new Error("ActBlue create CSV: missing id in response");
    }

    const deadline = Date.now() + 10 * 60 * 1000;
    let downloadUrl: string | null = null;
    while (Date.now() < deadline) {
      await sleep(5000);
      const stRes = await fetch(`${ACTBLUE_CSV_BASE}/${csvJobId}`, {
        headers: { Authorization: auth, Accept: "application/json" },
      });
      if (!stRes.ok) continue;
      const st = (await stRes.json()) as {
        status?: string;
        download_url?: string;
      };
      if (st.status === "complete" && st.download_url) {
        downloadUrl = st.download_url;
        break;
      }
    }

    if (!downloadUrl) {
      throw new Error("Timed out waiting for ActBlue CSV (10 minutes)");
    }

    const csvRes = await fetch(downloadUrl);
    if (!csvRes.ok) {
      throw new Error(`CSV download failed: HTTP ${csvRes.status}`);
    }
    const csvText = await csvRes.text();

    let records: Record<string, string>[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "CSV parse error"
      );
    }

    const receiptIds = new Set<string>();
    for (const rec of records) {
      const r = normalizeRow(rec);
      const rid = cell(r, "receipt id", "receipt_id");
      if (rid) receiptIds.add(rid);
    }

    const existing = new Set<string>();
    for (const part of chunk([...receiptIds], 200)) {
      if (part.length === 0) continue;
      const { data: rows } = await supabase
        .from("contributions")
        .select("actblue_receipt_id")
        .in("actblue_receipt_id", part);
      for (const row of rows ?? []) {
        if (row.actblue_receipt_id) existing.add(row.actblue_receipt_id);
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const rec of records) {
      const r = normalizeRow(rec);
      const receiptId = cell(r, "receipt id", "receipt_id");
      if (!receiptId) {
        skipped += 1;
        continue;
      }
      if (existing.has(receiptId)) {
        skipped += 1;
        continue;
      }

      const first = cell(r, "donor first name", "donor_first_name");
      const last = cell(r, "donor last name", "donor_last_name");
      const donorFullName = `${first} ${last}`.trim();
      if (!donorFullName) {
        skipped += 1;
        continue;
      }

      const amount = parseAmount(cell(r, "amount"));
      const dateStr = parsePaymentDate(cell(r, "payment date", "payment_date"));
      if (amount === null || !dateStr) {
        skipped += 1;
        continue;
      }

      const recurringRaw = cell(r, "recurring period", "recurring_period");
      const recurringLower = recurringRaw.toLowerCase();
      const isRecurring =
        recurringRaw !== "" && recurringLower !== "once";

      const rowPayload = {
        committee_id: committeeId,
        donor_full_name: donorFullName,
        amount,
        date: dateStr,
        payment_method: paymentMethodFromRow(r),
        employer: cell(r, "donor employer", "donor_employer") || null,
        occupation: cell(r, "donor occupation", "donor_occupation") || null,
        donor_email: cell(r, "donor email", "donor_email") || null,
        donor_address: cell(r, "donor addr1", "donor_addr1", "donor address") || null,
        donor_city: cell(r, "donor city", "donor_city") || null,
        donor_state: cell(r, "donor state", "donor_state") || null,
        donor_zip: cell(r, "donor zip", "donor_zip", "donor postal code") || null,
        donor_phone: cell(r, "donor phone", "donor_phone") || null,
        actblue_receipt_id: receiptId,
        actblue_lineitem_id:
          cell(r, "lineitem id", "lineitem_id") || null,
        actblue_payment_id: cell(r, "payment id", "payment_id") || null,
        is_recurring: isRecurring,
        recurring_period: recurringRaw || null,
        refunded: false,
        refund_date: null,
        source: "actblue" as const,
      };

      const { error: insErr } = await supabase
        .from("contributions")
        .insert(rowPayload);

      if (insErr) {
        if (insErr.code === "23505") {
          skipped += 1;
          existing.add(receiptId);
          continue;
        }
        skipped += 1;
        continue;
      }

      existing.add(receiptId);
      imported += 1;
    }

    await supabase
      .from("committees")
      .update({ actblue_last_synced_at: new Date().toISOString() })
      .eq("id", committeeId);

    await supabase
      .from("actblue_sync_logs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        contributions_imported: imported,
        contributions_skipped: skipped,
      })
      .eq("id", logId);

    return { imported, skipped, logId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await failLog(msg);
    throw e instanceof Error ? e : new Error(msg);
  }
}
