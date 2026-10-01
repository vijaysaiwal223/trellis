import { isDecisionClosed, type RenewalResolution } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import type { BadgeColor, Renewal } from "./types";

// Shown once a decision has actually closed the risk out — nothing more to do.
const closedDecisionDisplay: Record<string, { status: string; statusTone: BadgeColor }> = {
  Renew: { status: "Renewed", statusTone: "green" },
  "Right-size": { status: "Right-sized", statusTone: "green" },
};

// Shown when a decision is recorded but still needs real-world follow-through
// (vendor confirmation, finance review, finalized terms) — distinct wording
// so the queue never claims work is done when it isn't.
const pendingDecisionDisplay: Record<string, { status: string; statusTone: BadgeColor }> = {
  "Right-size": { status: "Negotiation in progress", statusTone: "blue" },
  Cancel: { status: "Cancellation pending", statusTone: "orange" },
  Escalate: { status: "Escalated — awaiting finance", statusTone: "blue" },
};

export type RenewalDisplay = {
  row: Renewal;
  slug: string;
  statusLabel: string;
  statusTone: BadgeColor;
  action: string;
  isUrgent: boolean;
};

/**
 * The single place that turns a raw assessed row + its session resolution
 * into what's actually shown — status badge, action verb, urgency weight.
 * Both the table and the kanban board call this so they can never drift
 * apart on what a given renewal's state means (the two views are just
 * different layouts of the same resolved truth).
 */
export function resolveRenewalDisplay(baseRow: Renewal, resolution: RenewalResolution | undefined): RenewalDisplay {
  const finalDecision = resolution?.decision && !resolution.decision.draft ? resolution.decision : undefined;
  const closed = finalDecision ? isDecisionClosed(finalDecision) : false;

  let row = baseRow;
  let action = row.action;
  if (finalDecision && closed) {
    const mapped = closedDecisionDisplay[finalDecision.action];
    row = { ...row, ...mapped };
    action = "View";
  } else if (finalDecision) {
    const mapped = pendingDecisionDisplay[finalDecision.action];
    row = { ...row, ...mapped };
    action = "View";
  } else if (resolution?.ownerAssigned && row.status === "Assign owner") {
    row = { ...row, status: "In review", statusTone: "blue" };
  }

  // Escalation state overrides the status badge instead of stacking a
  // contradicting caption under it, and distinguishes "owner still has it"
  // from "nobody's accountable, it's on admin now". It only clears once a
  // decision has actually closed the risk — a pending decision (cancellation
  // requested, negotiation open, escalated to finance) hasn't resolved
  // anything, so urgency/ownerless signals still apply.
  const escalationState = closed ? "none" : row.escalationState;
  const statusLabel =
    escalationState === "needsDecision"
      ? "Needs your decision"
      : escalationState === "waitingOnOwner"
        ? `Waiting on ${row.owner}`
        : row.status;
  const statusTone: BadgeColor =
    escalationState === "needsDecision" ? "red" : escalationState === "waitingOnOwner" ? "orange" : row.statusTone;

  // Button weight tracks urgency, not just which verb the action happens to be —
  // an unowned High-risk row should read as urgent even if its action is "Assign".
  const isUrgent = row.risk === "Critical" || row.risk === "High";

  return { row, slug: toVendorSlug(row.vendor), statusLabel, statusTone, action, isUrgent };
}
