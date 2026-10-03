import type { DecisionAction } from "@/features/renewal-detail/types";

import type { ISODate } from "./deadlines";

/** Where a contract's notice period came from. "default" is a labeled assumption. */
export type NoticeSource = "manual" | "extracted" | "default";

export type TermsSnapshot = {
  contractValue: number;
  renewalDate: ISODate;
  noticePeriodDays: number;
};

/** Follow-through work created by a decision (e.g. "Send the notice letter"). */
export type FollowUpTask = {
  id: string;
  label: string;
  dueBy?: ISODate;
  done: boolean;
};

export type DecisionRecord = {
  action: DecisionAction;
  note: string;
  ownerName?: string;
  /** Who made the call (the decider, or the admin acting for them). */
  decidedBy?: string;
  targetOutcome?: string;
  renewalStatus?: string;
  followUpBy?: string;
  recordedAt?: string;
  confirmedAt?: string;
  /** The renewal cycle (its renewal date) this decision applies to. */
  cycle?: ISODate;
  /** Terms as they stood when decided — a change to these re-opens the decision. */
  termsSnapshot?: TermsSnapshot;
  /** Follow-through steps derived from the action when the decision was recorded. */
  tasks?: FollowUpTask[];
  /** True while the decision is saved but not yet final — doesn't count as "resolved". */
  draft?: boolean;
};

export type DecisionEventLabel =
  | "Draft saved"
  | "Decision recorded"
  | "Decision corrected"
  | "Outcome confirmed"
  | "Decider assigned"
  | "Owner assigned"
  | "Notice terms confirmed"
  | "Terms changed — decision re-opened"
  | "Reminder acknowledged"
  | "Reminders snoozed"
  | "Renewal outcome recorded"
  | "Lead time changed";

export type DecisionEvent = {
  at: string;
  label: DecisionEventLabel;
  action?: DecisionAction;
  ownerName?: string;
  detail?: string;
};

/** Notice terms entered by hand or extracted from a contract and confirmed by a person. */
export type TermsOverride = {
  noticePeriodDays?: number;
  renewalDate?: ISODate;
  contractValue?: number;
  source: NoticeSource;
  /** 0-100, for extracted terms. */
  confidence?: number;
  /** The contract sentence the terms came from, shown at confirmation. */
  excerpt?: string;
  confirmedAt: string;
};

export type SnoozeState = {
  until: ISODate;
  /** How many times this contract has been snoozed in total. */
  count: number;
};

export type RenewalOutcome = "auto-renewed" | "lapsed";

export type RenewalResolution = {
  decision?: DecisionRecord;
  ownerAssigned?: string;
  deciderAssigned?: string;
  history?: DecisionEvent[];
  /** Per-contract override of the org's lead time. */
  leadTimeOverrideDays?: number;
  terms?: TermsOverride;
  /** Ladder step id → ISO timestamp of acknowledgement. */
  acks?: Record<string, string>;
  snooze?: SnoozeState;
  /** What actually happened at a renewal date (keyed by that date). */
  outcomes?: Record<ISODate, RenewalOutcome>;
  inactive?: boolean;
};

/**
 * Recording a decision isn't the same as the underlying work being done —
 * Cancel and Escalate both hand off real-world follow-through (confirming
 * with the vendor, finance actually reviewing) that this prototype can't
 * verify automatically. Right-size also needs confirmed new terms.
 * A recorded intent only closes the risk after someone confirms its outcome.
 */
export function isDecisionClosed(decision: DecisionRecord): boolean {
  if (decision.draft) return false;
  return decision.action !== "Escalate" && Boolean(decision.confirmedAt);
}

export type OrgSettings = {
  /** Days before the notice deadline that a decision is due. */
  leadTimeDays: number;
  orgTimeZone: string;
  holidays: ISODate[];
  /** Escalation target for T-14 and later. Null means escalations have nowhere to go. */
  financeLead: string | null;
  /** Conservative notice period assumed when a contract's terms are unknown. */
  defaultNoticeDays: number;
  /** Most times one contract's reminders can be snoozed. */
  snoozeLimit: number;
  /** Most nudges one person receives per day before the rest are held back. */
  dailyNudgeLimit: number;
};

export const defaultOrgSettings: OrgSettings = {
  leadTimeDays: 14,
  orgTimeZone: "UTC",
  holidays: [],
  financeLead: null,
  defaultNoticeDays: 90,
  snoozeLimit: 2,
  dailyNudgeLimit: 3,
};

export type LadderStepId = "t30" | "t14" | "t7" | "deadline" | "missed";

export type NudgeChannel = "slack" | "teams" | "email";

export type OutboxEntry = {
  id: string;
  contractId: string;
  vendor: string;
  step: LadderStepId | "digest";
  recipient: string;
  role: "decider" | "finance-lead";
  channel: NudgeChannel;
  /** The ladder date this nudge belongs to. */
  scheduledFor: ISODate;
  sentAt: string;
  /** Simulated one-click link credential. Single use. */
  token: string;
  usedAt?: string;
  ackedAt?: string;
  subject: string;
};

export type AnalyticsEventType =
  | "nudge_sent"
  | "nudge_acknowledged"
  | "decision_recorded"
  | "outcome_confirmed"
  | "terms_captured"
  | "renewal_passed_without_decision"
  | "reminders_snoozed"
  | "digest_sent";

export type AnalyticsEvent = {
  at: string;
  type: AnalyticsEventType;
  contractId: string;
  detail?: string;
};
