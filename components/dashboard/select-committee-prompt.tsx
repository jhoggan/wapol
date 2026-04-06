export function SelectCommitteePrompt({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg">
        {description}
      </p>
    </div>
  );
}
