export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {title}
        </h1>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
