import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangeRequestReview, ProposedChangesView } from "./change-request-review";

export default async function AdminChangeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("ruleset_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const url = row.source_url as string | null;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/change-requests"
        className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← Change requests
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {row.change_type as string}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {row.status as string} · {(row.source as string) === "ai_agent" ? "AI" : "Manual"}
        </p>
      </div>

      {url ? (
        <p className="text-sm">
          <span className="text-neutral-500">Source: </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline break-all"
          >
            {url}
          </a>
        </p>
      ) : null}

      {(row.source_description as string | null) ? (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {row.source_description as string}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Proposed changes
        </h2>
        <ProposedChangesView value={row.proposed_changes} />
      </section>

      {(row.status as string) === "pending" ? <ChangeRequestReview id={id} /> : null}
    </div>
  );
}
