export function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {title}
      </p>
      <p className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
        {value}
      </p>
      {subtitle ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
