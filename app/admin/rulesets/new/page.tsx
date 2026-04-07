import Link from "next/link";

export default function AdminNewRulesetPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/rulesets"
        className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← Rulesets
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        New ruleset
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-lg">
        Draft rulesets can be created in the database or via a future form. For
        now, clone an existing draft in Supabase or ask engineering to seed
        placeholders.
      </p>
    </div>
  );
}
