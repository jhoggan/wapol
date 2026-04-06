"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommitteeOption } from "@/lib/dashboard/scope";
import { formatCurrency, formatDate } from "@/lib/format";

export type ExpenditureRow = {
  id: string;
  payee_name: string;
  amount: string;
  date: string;
  purpose: string;
};

type Props = {
  initialRows: ExpenditureRow[];
  committees: CommitteeOption[];
  scopedCommitteeLabel?: string;
};

export function ExpendituresClient({
  initialRows,
  committees,
  scopedCommitteeLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [committeeId, setCommitteeId] = useState(committees[0]?.id ?? "");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [purpose, setPurpose] = useState("");

  function resetForm() {
    setCommitteeId(committees[0]?.id ?? "");
    setPayeeName("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setPurpose("");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!committeeId) {
      setFormError("Select a committee.");
      return;
    }
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt)) {
      setFormError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("expenditures").insert({
      committee_id: committeeId,
      payee_name: payeeName.trim(),
      amount: amt,
      date,
      purpose: purpose.trim(),
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Expenditures
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {scopedCommitteeLabel
              ? `Expenditures for ${scopedCommitteeLabel}.`
              : "All expenditures for your committees."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={committees.length === 0}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add expenditure
        </button>
      </div>

      {committees.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          Add a candidate and committee before recording expenditures.
        </p>
      ) : null}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Payee</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {initialRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No expenditures yet.
                  </td>
                </tr>
              ) : (
                initialRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                      {row.payee_name}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                      {row.purpose}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exp-modal-title"
            className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="exp-modal-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Add expenditure
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {formError}
                </p>
              ) : null}
              <div>
                <label className="text-sm font-medium block mb-1">Committee</label>
                <select
                  required
                  value={committeeId}
                  onChange={(e) => setCommitteeId(e.target.value)}
                  className={inputClass}
                >
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Payee name</label>
                <input
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Purpose / description
                </label>
                <textarea
                  required
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
