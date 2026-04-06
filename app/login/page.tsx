import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  missing_code: "Authentication link was invalid. Try again.",
  callback: "Could not complete sign-in. Try again.",
  auth: "Something went wrong. Try again.",
};

function safeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }
  return path;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const errorKey = params.error;
  const errorMessage = errorKey ? errorMessages[errorKey] ?? errorKey : undefined;

  return <LoginForm nextPath={nextPath} errorMessage={errorMessage} />;
}
