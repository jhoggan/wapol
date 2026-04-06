"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function CommitteesNotAvailableContent() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get("state");
  const displayState = stateParam?.trim() || "your state";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          We&apos;re not available in your area yet
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Wasatch Political currently supports Utah committees only. We&apos;re
          working hard to expand — check back soon.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go back to dashboard
          </Link>
        </div>

        <div className="pt-10 border-t border-neutral-200 dark:border-neutral-800 mt-10 text-left">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">
            Notify me when you expand to {displayState}
          </p>
          {submitted ? (
            <p className="text-sm text-green-700 dark:text-green-400">
              Thanks — we&apos;ll keep you in mind. (This is a preview only;
              nothing was saved.)
            </p>
          ) : (
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <input
                type="email"
                name="notify-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
              />
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shrink-0"
              >
                Notify me
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
