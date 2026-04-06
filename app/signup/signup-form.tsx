"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const origin = window.location.origin;
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Check your email for a confirmation link to finish signing up."
    );
  }

  return (
    <AuthLayout title="Create account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {message}
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-medium block">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="signup-password"
            className="text-sm font-medium block"
          >
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />
          <p className="text-xs text-neutral-500">At least 6 characters.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-neutral-900 dark:text-neutral-100 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
