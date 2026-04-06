"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
  errorMessage?: string;
  successMessage?: string;
};

export function LoginForm({ nextPath, errorMessage, successMessage }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [dismissSuccessBanner, setDismissSuccessBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDismissSuccessBanner(true);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {successMessage && !dismissSuccessBanner && (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {successMessage}
          </p>
        )}
        {(error || errorMessage) && (
          <p
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error ?? errorMessage}
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium block">
            Email
          </label>
          <input
            id="login-email"
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
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/login/forgot-password"
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-neutral-900 dark:text-neutral-100 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
