"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (data ?? []) as NotificationRow[];
    setRows(list);
    setUnread(list.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  }

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

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div className="relative mt-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-full flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-600 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200"
        aria-expanded={open}
      >
        Notifications
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute left-0 right-0 mt-1 z-[250] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Recent
            </span>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-blue-600 dark:text-blue-400"
            >
              Mark all read
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-sm text-neutral-500 text-center">
              No notifications
            </p>
          ) : (
            <ul className="py-1">
              {rows.slice(0, 10).map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2 border-b border-neutral-50 dark:border-neutral-800/80 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {n.title}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-neutral-400">
                      {timeAgo(n.created_at)}
                    </span>
                    {!n.read ? (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-[10px] font-medium text-blue-600 dark:text-blue-400"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              href="/dashboard/notifications"
              className="text-sm font-medium text-blue-600 dark:text-blue-400"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
