"use client";

import type { DashboardCommittee } from "@/lib/dashboard/scope";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "wapol:activeCommitteeId";

type ActiveCommitteeContextValue = {
  committees: DashboardCommittee[];
  activeCommitteeId: string | null;
  setActiveCommitteeId: (id: string | null) => void;
  hasHydrated: boolean;
};

const ActiveCommitteeContext = createContext<ActiveCommitteeContextValue | null>(
  null
);

export function ActiveCommitteeProvider({
  committees,
  children,
}: {
  committees: DashboardCommittee[];
  children: React.ReactNode;
}) {
  const [activeCommitteeId, setActiveCommitteeIdState] = useState<string | null>(
    null
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  const idSet = useMemo(
    () => new Set(committees.map((c) => c.id)),
    [committees]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && idSet.has(raw)) {
        setActiveCommitteeIdState(raw);
      }
    } catch {
      /* ignore */
    }
    setHasHydrated(true);
  }, [idSet]);

  const setActiveCommitteeId = useCallback((id: string | null) => {
    setActiveCommitteeIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeCommitteeId && !idSet.has(activeCommitteeId)) {
      setActiveCommitteeIdState(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [activeCommitteeId, idSet]);

  const value = useMemo(
    () => ({
      committees,
      activeCommitteeId,
      setActiveCommitteeId,
      hasHydrated,
    }),
    [committees, activeCommitteeId, setActiveCommitteeId, hasHydrated]
  );

  return (
    <ActiveCommitteeContext.Provider value={value}>
      {children}
    </ActiveCommitteeContext.Provider>
  );
}

export function useActiveCommittee() {
  const ctx = useContext(ActiveCommitteeContext);
  if (!ctx) {
    throw new Error("useActiveCommittee must be used within ActiveCommitteeProvider");
  }
  return ctx;
}
