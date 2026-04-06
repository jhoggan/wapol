"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

export default function WaitlistPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      state: state.trim(),
      entity_type: null,
      party: null,
      notes: null,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    router.push("/waitlist/confirmation");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-neutral-100 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
        <Link
          href="/"
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {formError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {formError}
            </p>
          ) : null}
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
            disabled={saving}
            className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
