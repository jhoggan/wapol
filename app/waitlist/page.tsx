"use client";

import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-neutral-100 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-6">
          Join the Waitlist
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          We&apos;re not currently supporting Republican campaigns, but we&apos;d
          love to stay in touch.
        </p>

        {submitted ? (
          <p
            className="mt-8 text-sm font-medium text-neutral-800 dark:text-neutral-200"
            role="status"
          >
            Thank you — we&apos;ll be in touch.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="wl-fn" className="text-sm font-medium block mb-1">
                First name
              </label>
              <input
                id="wl-fn"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wl-ln" className="text-sm font-medium block mb-1">
                Last name
              </label>
              <input
                id="wl-ln"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wl-em" className="text-sm font-medium block mb-1">
                Email
              </label>
              <input
                id="wl-em"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wl-st" className="text-sm font-medium block mb-1">
                State
              </label>
              <input
                id="wl-st"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
