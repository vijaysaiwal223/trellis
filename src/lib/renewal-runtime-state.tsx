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

import { toast } from "@medusajs/ui";

import { needsWrittenNotice, type DecisionAction } from "@/features/renewal-detail/types";
import { stamp } from "@/lib/clock";
import { formatLongISO } from "@/features/renewal-risk/deadlines";
import { renewals } from "@/features/renewal-risk/mock-data";
import { toVendorSlug } from "@/lib/vendor-slug";

/** Vendor name for a slug, for toast copy. */
function vendorLabel(slug: string) {
  return renewals.find((r) => toVendorSlug(r.vendor) === slug)?.vendor ?? slug;
}

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

// Bumped with the demo seed, so browsers don't keep state saved against the old seed.
const STORAGE_KEY = "trellis-renewal-runtime-v2";

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
 * Demo starting point, as on the design's first screen (5 Oct): Jira is already
 * handled, HubSpot's owner has recommended, and three owners have been asked.
 */
const demoResolutions: Record<string, RenewalResolution> = {
  jira: {
    decision: {
      action: "Renew",
      note: "Usage is high and the team uses nearly every seat. Renew as is.",
      recordedAt: "2026-09-28T10:00:00.000Z",
      confirmedAt: "2026-09-28T10:00:00.000Z",
    },
  },
  hubspot: {
    recommendation: {
      action: "Renegotiate",
      note: "Adoption is 73% and rising, but the 18% increase is too high. Push back on price and keep the seats.",
      submittedAt: "2026-10-02T10:00:00.000Z",
    },
  },
  salesforce: {
    ownerRequest: { sentAt: "2026-10-01T09:00:00.000Z", dueBy: "2026-10-26", from: "Anika Rao" },
  },
  asana: {
    ownerRequest: { sentAt: "2026-10-01T09:00:00.000Z", dueBy: "2026-10-26", from: "Anika Rao" },
  },
  tableau: {
    ownerRequest: { sentAt: "2026-10-02T09:00:00.000Z", dueBy: "2026-10-27", from: "Anika Rao" },
  },
};

export function RenewalRuntimeProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, RenewalResolution>>(demoResolutions);

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ resolutions }));
    } catch {
      // The session remains usable when storage is blocked or full.
    }
  }, [restored, resolutions]);

  const assignOwner = useCallback((slug: string, name: string, options?: AssignOptions) => {
    toast.success(`${name} assigned to ${vendorLabel(slug)}`, {
      description: options?.ownerRequest ? `Recommendation due ${options.ownerRequest.dueBy}` : "Status updated",
    });
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
    toast.success(`Question sent to owner`, { description: vendorLabel(slug) });
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
    toast.info(`Next cycle scheduled for ${vendorLabel(slug)}`, { description: `Review on ${formatLongISO(reviewOn)}` });
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
    toast.info(`${vendorLabel(slug)} renews as is`, { description: "Status: Handled" });
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
    const vendor = vendorLabel(slug);
    if (decision.draft) {
      toast.info(`Draft saved for ${vendor}`);
    } else if (decision.confirmedAt) {
      toast.success(`${vendor} handled`, { description: `Outcome confirmed · ${decision.action}` });
    } else {
      toast.success(`Decision recorded for ${vendor}`, {
        description: needsWrittenNotice(decision.action) ? "Status: Ready for notice" : "Status: Awaiting outcome",
      });
    }
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
    toast.success(`Recommendation sent for ${vendorLabel(slug)}`, { description: "Status: Recommendation in" });
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
    toast.success(`Notice sent for ${vendorLabel(slug)}`, { description: "Status: Awaiting outcome" });
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
