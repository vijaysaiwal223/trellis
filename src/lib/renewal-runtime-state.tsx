"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  defaultIntegrations,
  type IntegrationId,
  type IntegrationSettings,
} from "@/config/integrations";
import type { DecisionAction } from "@/features/renewal-detail/types";

export type DecisionRecord = {
  action: DecisionAction;
  note: string;
  targetOutcome?: string;
  renewalStatus?: string;
  followUpBy?: string;
  /** True while the decision is saved but not yet final — doesn't count as "resolved". */
  draft?: boolean;
};

export type RenewalResolution = {
  decision?: DecisionRecord;
  ownerAssigned?: string;
};

type RenewalRuntimeContextValue = {
  /** Keyed by vendor slug (see @/lib/vendor-slug). */
  resolutions: Record<string, RenewalResolution>;
  assignOwner: (slug: string, name: string) => void;
  confirmDecision: (slug: string, decision: DecisionRecord) => void;
  /** People who have left the company; tools they own count as unowned. */
  departedOwners: string[];
  markDeparted: (name: string) => void;
  reinstateOwner: (name: string) => void;
  /** Policy: when an owner departs, hand their tools to a colleague automatically. */
  autoHandoff: boolean;
  setAutoHandoff: (value: boolean) => void;
  /** Where alerts are delivered besides the in-app bell. */
  integrations: Record<IntegrationId, IntegrationSettings>;
  updateIntegration: (id: IntegrationId, patch: Partial<IntegrationSettings>) => void;
};

const RenewalRuntimeContext = createContext<RenewalRuntimeContextValue | null>(null);

/**
 * Session-only state shared between the Renewal Risk dashboard, the
 * per-vendor detail pages and Settings, so a change in one place shows up
 * everywhere else without a backend.
 */
export function RenewalRuntimeProvider({ children }: { children: ReactNode }) {
  const [resolutions, setResolutions] = useState<Record<string, RenewalResolution>>({});
  const [departedOwners, setDepartedOwners] = useState<string[]>([]);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [integrations, setIntegrations] = useState(defaultIntegrations);

  const assignOwner = useCallback((slug: string, name: string) => {
    setResolutions((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], ownerAssigned: name },
    }));
  }, []);

  const confirmDecision = useCallback((slug: string, decision: DecisionRecord) => {
    setResolutions((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], decision },
    }));
  }, []);

  const markDeparted = useCallback((name: string) => {
    setDepartedOwners((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const reinstateOwner = useCallback((name: string) => {
    setDepartedOwners((prev) => prev.filter((entry) => entry !== name));
  }, []);

  const updateIntegration = useCallback((id: IntegrationId, patch: Partial<IntegrationSettings>) => {
    setIntegrations((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const value = useMemo(
    () => ({
      resolutions,
      assignOwner,
      confirmDecision,
      departedOwners,
      markDeparted,
      reinstateOwner,
      autoHandoff,
      setAutoHandoff,
      integrations,
      updateIntegration,
    }),
    [
      resolutions,
      assignOwner,
      confirmDecision,
      departedOwners,
      markDeparted,
      reinstateOwner,
      autoHandoff,
      integrations,
      updateIntegration,
    ],
  );

  return <RenewalRuntimeContext.Provider value={value}>{children}</RenewalRuntimeContext.Provider>;
}

export function useRenewalRuntime() {
  const context = useContext(RenewalRuntimeContext);
  if (!context) {
    throw new Error("useRenewalRuntime must be used within a RenewalRuntimeProvider");
  }
  return context;
}
