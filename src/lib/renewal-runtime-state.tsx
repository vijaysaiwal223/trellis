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
import { formatLongISO } from "@/features/renewal-risk/deadlines";

export const noticeMethods = ["Email to account executive", "Vendor portal", "Letter"] as const;
export type NoticeMethod = (typeof noticeMethods)[number];

export type DecisionRecord = {
  action: DecisionAction;
  note: string;
  ownerName?: string;
  targetOutcome?: string;
  renewalStatus?: string;
  followUpBy?: string;
  recordedAt?: string;
  confirmedAt?: string;
  /** Written notice to the vendor, for answers that need one. */
  noticeSentAt?: string;
  noticeMethod?: NoticeMethod;
  /** The vendor's confirmation reference (reply email, portal ID), if they gave one. */
  vendorReference?: string;
  /** True while the decision is saved but not yet final — doesn't count as "resolved". */
  draft?: boolean;
};

/** A question the owner asked finance while answering. */
export type OwnerQuestion = { at: string; text: string };

/** The decision request sent to the owner, with the date their recommendation is needed by. */
export type OwnerRequest = { sentAt: string; dueBy: string; from: string };

/**
 * The owner's answer. It is advice: finance or procurement reviews it and
 * records the decision, which can differ.
 */
export type OwnerRecommendation = {
  action: DecisionAction;
  targetOutcome?: string;
  note: string;
  submittedAt: string;
};

export type RenewalResolution = {
  decision?: DecisionRecord;
  recommendation?: OwnerRecommendation;
  ownerAssigned?: string;
  /** Set when the owner was asked for a recommendation by a due date. */
  ownerRequest?: OwnerRequest;
  /** Assigned as the owner for future renewals of this vendor too. */
  standingOwner?: boolean;
  questions?: OwnerQuestion[];
  /** Next review date, for a missed deadline that rolls into the next cycle. */
  nextCycleReviewOn?: string;
  history?: DecisionEvent[];
};

export type DecisionEvent = {
  at: string;
  label:
    | "Owner assigned"
    | "Draft saved"
    | "Recommendation sent"
    | "Question asked"
    | "Decision recorded"
    | "Decision corrected"
    | "Notice sent"
    | "Vendor response logged"
    | "Next cycle scheduled"
    | "Outcome confirmed";
  action?: DecisionAction;
  ownerName?: string;
  /** Free text for the audit trail: the question, the vendor's response, the reference. */
  note?: string;
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
  assignOwner: (slug: string, name: string, options?: AssignOptions) => void;
  confirmDecision: (slug: string, decision: DecisionRecord) => void;
  /** The owner's advice. It doesn't close anything; the decision is still recorded separately. */
  recordRecommendation: (slug: string, recommendation: OwnerRecommendation) => void;
  /** Written notice went to the vendor. Only meaningful after a decision that needs notice. */
  recordNotice: (slug: string, notice: { sentAt: string; method: NoticeMethod; reference?: string }) => void;
  askOwnerQuestion: (slug: string, text: string) => void;
  /** The vendor's answer to a request for a concession. The renewal stays open. */
  logVendorResponse: (slug: string, text: string) => void;
  scheduleNextCycle: (slug: string, reviewOn: string) => void;
  /** Accept a missed-deadline renewal as it is. Recorded and confirmed in one step. */
  acceptAsIs: (slug: string) => void;
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

export type AssignOptions = {
  /** Ask the owner for a recommendation by this date. */
  ownerRequest?: OwnerRequest;
  standingOwner?: boolean;
};

const RenewalRuntimeContext = createContext<RenewalRuntimeContextValue | null>(null);

/**
 * Browser-local state shared between the Renewal Risk dashboard, the
 * per-vendor detail pages and Settings. It survives reloads on this device;
 * a backend is still required for shared ownership and external delivery.
 */
/**
 * Demo starting point: one owner has already answered, so the "Recommendation in"
 * status and its review drawer are reachable. Replaced by saved state once it exists.
 */
const demoResolutions: Record<string, RenewalResolution> = {
  snowflake: {
    recommendation: {
      action: "Right-size",
      targetOutcome: "Reduce to 70 seats",
      note: "About 15 seats have been inactive for 30+ days. Keeping 70 covers the Q1 hires.",
      submittedAt: "2026-09-25T10:00:00.000Z",
    },
  },
};

export function RenewalRuntimeProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, RenewalResolution>>(demoResolutions);
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

  const assignOwner = useCallback((slug: string, name: string, options?: AssignOptions) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      return {
        ...prev,
        [slug]: {
          ...previous,
          ownerAssigned: name,
          ownerRequest: options?.ownerRequest ?? previous?.ownerRequest,
          standingOwner: options?.standingOwner ?? previous?.standingOwner,
          history: [
            ...(previous?.history ?? []),
            {
              at: options?.ownerRequest?.sentAt ?? stamp(),
              label: "Owner assigned",
              ownerName: name,
              note: options?.ownerRequest ? `Recommendation requested by ${options.ownerRequest.dueBy}` : undefined,
            },
          ],
        },
      };
    });
  }, []);

  const appendEvent = useCallback((slug: string, event: DecisionEvent) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      return { ...prev, [slug]: { ...previous, history: [...(previous?.history ?? []), event] } };
    });
  }, []);

  const askOwnerQuestion = useCallback((slug: string, text: string) => {
    const at = stamp();
    setResolutions((prev) => {
      const previous = prev[slug];
      return {
        ...prev,
        [slug]: {
          ...previous,
          questions: [...(previous?.questions ?? []), { at, text }],
          history: [...(previous?.history ?? []), { at, label: "Question asked", ownerName: previous?.ownerAssigned, note: text }],
        },
      };
    });
  }, []);

  const logVendorResponse = useCallback((slug: string, text: string) => {
    appendEvent(slug, { at: stamp(), label: "Vendor response logged", note: text });
  }, [appendEvent]);

  const scheduleNextCycle = useCallback((slug: string, reviewOn: string) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      return {
        ...prev,
        [slug]: {
          ...previous,
          nextCycleReviewOn: reviewOn,
          history: [...(previous?.history ?? []), { at: stamp(), label: "Next cycle scheduled", note: `Review on ${formatLongISO(reviewOn)}` }],
        },
      };
    });
  }, []);

  const acceptAsIs = useCallback((slug: string) => {
    const decision: DecisionRecord = {
      action: "Renew",
      note: "Notice deadline missed. Accepted as is.",
      renewalStatus: "Renews as is",
      recordedAt: stamp(),
      confirmedAt: stamp(),
    };
    setResolutions((prev) => {
      const previous = prev[slug];
      const at = stamp();
      return {
        ...prev,
        [slug]: {
          ...previous,
          decision: { ...decision, ownerName: previous?.ownerAssigned, recordedAt: at, confirmedAt: at },
          history: [
            ...(previous?.history ?? []),
            { at, label: "Decision recorded", action: "Renew", ownerName: previous?.ownerAssigned, note: decision.note },
            { at, label: "Outcome confirmed", action: "Renew", ownerName: previous?.ownerAssigned },
          ],
        },
      };
    });
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

  const recordRecommendation = useCallback((slug: string, recommendation: OwnerRecommendation) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      return {
        ...prev,
        [slug]: {
          ...previous,
          recommendation,
          history: [
            ...(previous?.history ?? []),
            { at: recommendation.submittedAt, label: "Recommendation sent", action: recommendation.action, ownerName: previous?.ownerAssigned },
          ],
        },
      };
    });
  }, []);

  const recordNotice = useCallback((slug: string, notice: { sentAt: string; method: NoticeMethod; reference?: string }) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      if (!previous?.decision) return prev;
      const reference = notice.reference?.trim() || undefined;
      return {
        ...prev,
        [slug]: {
          ...previous,
          decision: { ...previous.decision, noticeSentAt: notice.sentAt, noticeMethod: notice.method, vendorReference: reference },
          history: [
            ...(previous.history ?? []),
            {
              at: notice.sentAt,
              label: "Notice sent",
              action: previous.decision.action,
              ownerName: previous.decision.ownerName,
              note: [notice.method, reference ? `Ref ${reference}` : null].filter(Boolean).join(" · "),
            },
          ],
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
      recordRecommendation,
      recordNotice,
      askOwnerQuestion,
      logVendorResponse,
      scheduleNextCycle,
      acceptAsIs,
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
      recordRecommendation,
      recordNotice,
      askOwnerQuestion,
      logVendorResponse,
      scheduleNextCycle,
      acceptAsIs,
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
