import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function adminOr403() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin_user");
  if (error || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { supabase, user };
}
