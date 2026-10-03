"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { stamp } from "@/lib/clock";

export type DecisionRecord = {
  action: DecisionAction;
  note: string;
  ownerName?: string;
  targetOutcome?: string;
  renewalStatus?: string;
  followUpBy?: string;
  recordedAt?: string;
  confirmedAt?: string;
  /** True while the decision is saved but not yet final — doesn't count as "resolved". */
  draft?: boolean;
};

export type RenewalResolution = {
  decision?: DecisionRecord;
  ownerAssigned?: string;
  history?: DecisionEvent[];
};

export type DecisionEvent = {
  at: string;
  label: "Draft saved" | "Decision recorded" | "Decision corrected" | "Outcome confirmed";
  action: DecisionAction;
  ownerName?: string;
};

/**
 * Recording a decision isn't the same as the underlying work being done —
 * Cancel and Downsize both hand off real-world follow-through (confirming
 * with the vendor, agreeing new terms) that this prototype can't verify
 * automatically. A recorded intent only closes the risk after someone
 * confirms its outcome.
 */
export function isDecisionClosed(decision: DecisionRecord): boolean {
  if (decision.draft) return false;
  return Boolean(decision.confirmedAt);
}

const STORAGE_KEY = "trellis-renewal-runtime-v1";

type RenewalRuntimeContextValue = {
  /** Keyed by vendor slug (see @/lib/vendor-slug). */
  resolutions: Record<string, RenewalResolution>;
  assignOwner: (slug: string, name: string) => void;
  confirmDecision: (slug: string, decision: DecisionRecord) => void;
  /** One-click links already used to record a decision; each works once. */
  usedTokens: string[];
  markTokenUsed: (token: string) => void;
  /** False until the browser store has been read. */
  ready: boolean;
  /** People who have left the company; tools they own count as unowned. */
  departedOwners: string[];
  markDeparted: (name: string) => void;
  reinstateOwner: (name: string) => void;
  /** Policy: when an owner departs, hand their tools to a colleague automatically. */
  autoHandoff: boolean;
  setAutoHandoff: (value: boolean) => void;
  /** Prototype settings for future external alerts; no delivery is connected. */
  integrations: Record<IntegrationId, IntegrationSettings>;
  updateIntegration: (id: IntegrationId, patch: Partial<IntegrationSettings>) => void;
};

const RenewalRuntimeContext = createContext<RenewalRuntimeContextValue | null>(null);

/**
 * Browser-local state shared between the Renewal Risk dashboard, the
 * per-vendor detail pages and Settings. It survives reloads on this device;
 * a backend is still required for shared ownership and external delivery.
 */
export function RenewalRuntimeProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, RenewalResolution>>({});
  const [departedOwners, setDepartedOwners] = useState<string[]>([]);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [integrations, setIntegrations] = useState(defaultIntegrations);
  const [usedTokens, setUsedTokens] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const snapshot = JSON.parse(saved) as Record<string, unknown>;
          if (snapshot.resolutions && typeof snapshot.resolutions === "object" && !Array.isArray(snapshot.resolutions)) {
            setResolutions(snapshot.resolutions as Record<string, RenewalResolution>);
          }
          if (Array.isArray(snapshot.departedOwners)) {
            setDepartedOwners(snapshot.departedOwners.filter((name): name is string => typeof name === "string"));
          }
          if (typeof snapshot.autoHandoff === "boolean") setAutoHandoff(snapshot.autoHandoff);
          if (snapshot.integrations && typeof snapshot.integrations === "object" && !Array.isArray(snapshot.integrations)) {
            setIntegrations(snapshot.integrations as Record<IntegrationId, IntegrationSettings>);
          }
          if (Array.isArray(snapshot.usedTokens)) {
            setUsedTokens(snapshot.usedTokens.filter((token): token is string => typeof token === "string"));
          }
        }
      } catch {
        // A corrupt or unavailable browser store must not prevent use of the prototype.
      } finally {
        setRestored(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ resolutions, departedOwners, autoHandoff, integrations, usedTokens }));
    } catch {
      // The session remains usable when storage is blocked or full.
    }
  }, [restored, resolutions, departedOwners, autoHandoff, integrations, usedTokens]);

  const assignOwner = useCallback((slug: string, name: string) => {
    setResolutions((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], ownerAssigned: name },
    }));
  }, []);

  const confirmDecision = useCallback((slug: string, decision: DecisionRecord) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      const now = stamp();
      const label: DecisionEvent["label"] = decision.draft
        ? "Draft saved"
        : decision.confirmedAt && !previous?.decision?.confirmedAt
          ? "Outcome confirmed"
          : previous?.decision && !previous.decision.draft
            ? "Decision corrected"
            : "Decision recorded";
      return {
        ...prev,
        [slug]: {
          ...previous,
          decision: {
            ...decision,
            recordedAt: decision.draft
              ? decision.recordedAt
              : decision.recordedAt ?? previous?.decision?.recordedAt ?? now,
          },
          history: [...(previous?.history ?? []), { at: now, label, action: decision.action, ownerName: decision.ownerName }],
        },
      };
    });
  }, []);

  const markTokenUsed = useCallback((token: string) => {
    setUsedTokens((prev) => (prev.includes(token) ? prev : [...prev, token]));
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
      usedTokens,
      markTokenUsed,
      ready: restored,
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
      usedTokens,
      markTokenUsed,
      restored,
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
