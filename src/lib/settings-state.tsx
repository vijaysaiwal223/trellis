"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { ContractType } from "@/features/renewal-risk/types";

export type ReminderTiming = "after_overdue" | "on_due" | "never";

export type RenewalRules = {
  /** Days before the decide-by date an owner is asked for a recommendation. */
  askOwnerDaysBefore: number;
  /** Days after a missed due date before the renewal lead decides alone. */
  escalateAfterDays: number;
  reminder: ReminderTiming;
  /** Month-to-month contracts live in Spend, not the decision queue. */
  skipMonthToMonth: boolean;
  /** Default owner per category, used first when suggesting an owner. */
  defaultOwners: Record<string, string>;
};

/** Admin corrections to a contract's terms. They replace the seeded values. */
export type ContractOverride = { noticePeriodDays?: number; contractType?: ContractType };

type SettingsContextValue = {
  rules: RenewalRules;
  overrides: Record<string, ContractOverride>;
  setRules: (patch: Partial<RenewalRules>) => void;
  setOverride: (slug: string, patch: ContractOverride) => void;
};

export const defaultRules: RenewalRules = {
  askOwnerDaysBefore: 7,
  escalateAfterDays: 3,
  reminder: "after_overdue",
  skipMonthToMonth: true,
  defaultOwners: {},
};

const STORAGE_KEY = "trellis-settings-v1";

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [rules, setRulesState] = useState<RenewalRules>(defaultRules);
  const [overrides, setOverrides] = useState<Record<string, ContractOverride>>({});

  // Restore after mount so the first render matches the server.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const snapshot = JSON.parse(saved) as { rules?: Partial<RenewalRules>; overrides?: Record<string, ContractOverride> };
        if (snapshot.rules) setRulesState({ ...defaultRules, ...snapshot.rules });
        if (snapshot.overrides) setOverrides(snapshot.overrides);
      } catch {
        // Unreadable settings fall back to the defaults.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rules, overrides }));
    } catch {
      // Storage blocked: settings last for this session.
    }
  }, [rules, overrides]);

  const setRules = useCallback((patch: Partial<RenewalRules>) => setRulesState((prev) => ({ ...prev, ...patch })), []);

  const setOverride = useCallback((slug: string, patch: ContractOverride) => {
    setOverrides((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
  }, []);

  const value = useMemo(() => ({ rules, overrides, setRules, setOverride }), [rules, overrides, setRules, setOverride]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
