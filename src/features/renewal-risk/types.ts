export type Risk = "Critical" | "Low" | "Medium" | "High";

/**
 * "waitingOnOwner": window missed, but there's still an active owner who can
 * act (recovery paths) — nothing needed from admin yet.
 * "needsDecision": nobody's accountable (unassigned/departed) and it's
 * urgent — admin is the only one left who can act.
 */
export type EscalationState = "none" | "waitingOnOwner" | "needsDecision";

export type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple";

export type ContractType = "Auto-renew" | "Manual" | "Month-to-month";

/** Facts from the data model. Everything time- and risk-related is derived from these. */
export type RenewalSeed = {
  vendor: string;
  subtitle: string;
  logo: string;
  /** Renewal date minus notice period, as a display label. */
  cancelBy: string;
  /** Days until cancel-by. Negative means the window has already closed. */
  daysToCancelBy: number;
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

/** A seed plus the urgency assessment computed from it. */
export type Renewal = RenewalSeed & {
  contractAmount: string;
  risk: Risk;
  timing: string;
  timingTone?: "danger" | "warning";
  /** 0-100. Ranks the queue: cancel-by proximity x renewal type x value x ownership gap. */
  urgency: number;
  /** Human-readable reasons behind the ranking, most important first. */
  reasons: string[];
  escalationState: EscalationState;
  ownerStatus: "active" | "departed" | "unassigned";
};
