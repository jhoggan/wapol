import Link from "next/link";

export default function WaitlistConfirmationPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-neutral-100 dark:bg-neutral-950">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          You&apos;re on the list
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Thanks for your interest in Wasatch Political. We&apos;ll be in touch at
          the email you provided when we&apos;re ready to support your campaign.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-2.5 text-sm font-medium hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
