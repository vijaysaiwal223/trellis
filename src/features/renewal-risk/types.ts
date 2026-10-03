import type { ISODate } from "./deadlines";

export type Risk = "Critical" | "Low" | "Medium" | "High";

export type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple";

export type ContractType = "Auto-renew" | "Manual" | "Month-to-month";

/** Facts from the data model. Everything time- and risk-related is derived from these. */
export type RenewalSeed = {
  vendor: string;
  subtitle: string;
  logo: string;
  /** The renewal date on the contract. */
  renewalDate: ISODate;
  /** Days of notice the contract requires before it renews. */
  noticePeriodDays: number;
  contractValue: number;
  contractType: ContractType;
  /** null = no accountable owner (unassigned or departed). */
  owner: string | null;
  team: string | null;
  /** Why the seat is vacant, when owner is null. */
  vacancy?: "departed" | "unassigned";
  formerOwner?: string;
  usage: string;
  status: string;
  statusTone: BadgeColor;
  action: string;
};

type DerivedFromSeed = "renewalDate" | "noticePeriodDays";

/** A seed plus the deadlines and urgency assessment computed from it. */
export type Renewal = Omit<RenewalSeed, DerivedFromSeed> & {
  /** Stable key, the vendor slug. */
  id: string;
  renewalDate: ISODate;
  noticeDays: number;
  /** Last day to give notice (renewal date minus notice period), as a label and a date. */
  cancelBy: string;
  cancelByISO: ISODate;
  /** Days until cancel-by. Negative means the window has already closed. */
  daysToCancelBy: number;
  /** The internal target to decide by: cancel-by minus a two-week buffer, on a business day. */
  decideBy: string;
  decideByISO: ISODate;
  daysToDecideBy: number;
  contractAmount: string;
  risk: Risk;
  timing: string;
  timingTone?: "danger" | "warning";
  /** 0-100. Ranks the queue: cancel-by proximity x renewal type x value x ownership gap. */
  urgency: number;
  /** Human-readable reasons behind the ranking, most important first. */
  reasons: string[];
  ownerStatus: "active" | "departed" | "unassigned";
};
