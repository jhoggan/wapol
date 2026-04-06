import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "./forgot-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <ForgotPasswordForm />;
}
