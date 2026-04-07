import type { SupabaseClient } from "@supabase/supabase-js";
import type { RaceType } from "@/lib/campaign-labels";

export function parseDistrictNumber(
  officeName: string,
  raceType: RaceType | ""
): number | null {
  if (!officeName.trim() || !raceType) return null;
  if (
    raceType !== "state_house" &&
    raceType !== "state_senate" &&
    raceType !== "state_school_board"
  ) {
    return null;
  }
  const m = officeName.match(/(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchDistrictCountyScope(
  supabase: SupabaseClient,
  opts: { raceType: string; districtNumber: number; state?: string }
): Promise<"single_county" | "multi_county" | null> {
  const { data } = await supabase
    .from("district_county_map")
    .select("county_scope")
    .eq("race_type", opts.raceType)
    .eq("district_number", opts.districtNumber)
    .eq("state", opts.state ?? "Utah")
    .maybeSingle();

  const s = data?.county_scope as string | undefined;
  if (s === "single_county" || s === "multi_county") return s;
  return null;
}
