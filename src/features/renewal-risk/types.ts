import type { ISODate } from "./deadlines";
import type { NoticeSource, TermsSnapshot } from "./decision-model";

export type Risk = "Critical" | "Low" | "Medium" | "High";

export type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple";

export type ContractType = "Auto-renew" | "Manual" | "Month-to-month";

/** Facts from the data model. Everything time- and risk-related is derived from these. */
export type RenewalSeed = {
  /** Stable contract id. Defaults to the vendor slug; set it when two contracts share a vendor. */
  id?: string;
  vendor: string;
  subtitle: string;
  logo: string;
  /** The (first) renewal date on the contract. Auto-renewing contracts roll forward from it. */
  renewalDate: ISODate;
  /** Days of notice the contract requires. null = the terms are not on file (a blind spot). */
  noticePeriodDays: number | null;
  noticeSource?: NoticeSource;
  /** Months per renewal cycle: 1 monthly, 12 annual, 36 multi-year. Defaults to 12. */
  termMonths?: number;
  /** ISO 4217. Defaults to USD. */
  currency?: string;
  contractValue: number;
  contractType: ContractType;
  /** The person who runs the tool day to day. null = no accountable owner (unassigned or departed). */
  owner: string | null;
  /** The person who decides renew/renegotiate/downsize/cancel. Defaults to the owner. */
  decider?: string | null;
  team: string | null;
  /** Why the seat is vacant, when owner is null. */
  vacancy?: "departed" | "unassigned";
  formerOwner?: string;
  usage: string;
  seats?: { purchased: number; active: number };
  status: string;
  statusTone: BadgeColor;
  action: string;
};

type DerivedFromSeed = "renewalDate" | "noticePeriodDays" | "noticeSource" | "decider";

/** A seed plus everything computed from it: deadlines, terms provenance and urgency. */
export type Renewal = Omit<RenewalSeed, DerivedFromSeed> & {
  id: string;
  /** The renewal date of the cycle currently ahead (may be later than the seed's date). */
  renewalDate: ISODate;
  /** The notice period in force — the contract's, or the labeled default. */
  noticeDays: number;
  noticeSource: NoticeSource;
  /** True when noticeDays is the org's conservative default rather than a known term. */
  noticeAssumed: boolean;
  /** Last day to give notice, as a display label and as a date. */
  cancelBy: string;
  cancelByISO: ISODate;
  /** Days until cancel-by. Negative means the window has already closed. */
  daysToCancelBy: number;
  /** Internal deadline for the decision: cancel-by minus lead time, on a business day. */
  decideBy: string;
  decideByISO: ISODate;
  daysToDecideBy: number;
  leadTimeDays: number;
  decideByShifted: boolean;
  decideByShiftReason?: "weekend" | "holiday";
  /** Renewal dates that already passed while the contract auto-renewed. */
  passedRenewals: ISODate[];
  /** Whether the Renewal Decisions behaviour is on (off = original cancel-by workflow). */
  decisionsEnabled: boolean;
  /** Who decides, after departures and reassignment. null = nobody. */
  decider: string | null;
  deciderStatus: "active" | "departed" | "unassigned";
  contractAmount: string;
  risk: Risk;
  timing: string;
  timingTone?: "danger" | "warning";
  /** 0-100. Ranks the queue: cancel-by proximity x renewal type x value x ownership gap. */
  urgency: number;
  /** Human-readable reasons behind the ranking, most important first. */
  reasons: string[];
  ownerStatus: "active" | "departed" | "unassigned";
  /** The terms in force now; stamped onto a decision so a later change can re-open it. */
  termsSnapshot: TermsSnapshot;
  /** Terms changed after a decision was recorded; the decision is re-opened. */
  termsChanges: string[];
  /** The contract is inactive (cancelled or ended) and not tracked. */
  inactive: boolean;
};
