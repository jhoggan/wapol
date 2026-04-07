"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  notification_type: string;
};

const tabs = ["all", "unread", "deadlines", "contributions", "system"] as const;

export default function NotificationsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, read, created_at, notification_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "unread") return rows.filter((r) => !r.read);
    if (tab === "deadlines") {
      return rows.filter((r) =>
        ["deadline_7_day", "deadline_3_day", "deadline_day_of"].includes(
          r.notification_type
        )
      );
    }
    if (tab === "contributions") {
      return rows.filter((r) =>
        [
          "contribution_31_day_warning",
          "contribution_31_day_final",
          "7_day_window_open",
        ].includes(r.notification_type)
      );
    }
    return rows.filter((r) =>
      ["ruleset_updated"].includes(r.notification_type)
    );
  }, [rows, tab]);

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    load();
  }

  async function markOne(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-2">
            Notifications
          </h1>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium self-start"
        >
          Mark all read
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
        {filtered.length === 0 ? (
          <li className="px-4 py-10 text-center text-neutral-500 text-sm">
            Nothing here.
          </li>
        ) : (
          filtered.map((n) => (
            <li key={n.id} className="px-4 py-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {n.title}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {n.message}
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read ? (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  className="shrink-0 text-sm text-blue-600 dark:text-blue-400 h-fit"
                >
                  Mark read
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
