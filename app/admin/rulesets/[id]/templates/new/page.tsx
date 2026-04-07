import Link from "next/link";

export default async function AdminNewTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link
        href={`/admin/rulesets/${id}`}
        className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← Ruleset
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Add template
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-lg">
        Template creation UI is not wired yet. Insert rows into{" "}
        <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">
          deadline_templates
        </code>{" "}
        in Supabase for this ruleset.
      </p>
    </div>
  );
}
