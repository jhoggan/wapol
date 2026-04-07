import { createClient } from "@/lib/supabase/server";

export default async function AdminDistrictMapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("district_county_map")
    .select("*")
    .order("race_type", { ascending: true })
    .order("district_number", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        District / county map
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Reference data for convention jurisdiction fallback (Utah).
      </p>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
              <th className="px-4 py-2 font-medium">Race</th>
              <th className="px-4 py-2 font-medium">District</th>
              <th className="px-4 py-2 font-medium">State</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium">Counties</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr
                key={`${r.race_type}-${r.district_number}-${r.state}`}
                className="border-b border-neutral-100 dark:border-neutral-800/80"
              >
                <td className="px-4 py-2 font-mono text-xs">{r.race_type as string}</td>
                <td className="px-4 py-2">{r.district_number as number}</td>
                <td className="px-4 py-2">{r.state as string}</td>
                <td className="px-4 py-2">{r.county_scope as string}</td>
                <td className="px-4 py-2">
                  {((r.counties as string[]) ?? []).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
