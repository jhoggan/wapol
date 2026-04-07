import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin_user");
  if (error || !isAdmin) {
    redirect("/dashboard");
  }

  return { supabase, user };
}
