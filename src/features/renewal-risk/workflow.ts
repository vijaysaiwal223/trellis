import { calendarDateIn, daysBetween, isValidISODate } from "./deadlines";
import { isDecisionClosed, type RenewalResolution } from "./decision-model";
import { now } from "@/lib/clock";
import type { BadgeColor, Renewal } from "./types";

export type RenewalTaskKind = "assign" | "decision" | "follow-up" | "done";
export type RenewalTaskLevel = "lead" | "overdue" | "soon" | "upcoming" | "done";

export type RenewalTask = {
  kind: RenewalTaskKind;
  level: RenewalTaskLevel;
  title: string;
  description: string;
  due: string;
  status: string;
  statusTone: BadgeColor;
  action: string;
  href: string;
  priority: number;
};

/** Days between the first ladder step and the decide-by date. */
const LADDER_START_DAYS = 30;

/**
 * A recorded decision only counts while it still describes reality: made for
 * this renewal cycle, on the terms that still hold. A price hike or a moved
 * renewal date re-opens it (the old decision stays in the history).
 */
export function isDecisionCurrent(row: Pick<Renewal, "renewalDate" | "termsChanges" | "decisionsEnabled">, resolution: RenewalResolution | undefined): boolean {
  const decision = resolution?.decision;
  if (!decision || decision.draft) return false;
  // The original workflow never re-opened a decision.
  if (!row.decisionsEnabled) return true;
  if (row.termsChanges.length > 0) return false;
  return !decision.cycle || decision.cycle === row.renewalDate;
}

function shortDue(days: number, label: string) {
  if (days < 0) return `${label} overdue by ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return `${label} due today`;
  return `${label} due in ${days} day${days === 1 ? "" : "s"}`;
}

function followUpDays(dateOnly: string | undefined): number | null {
  if (!dateOnly || !isValidISODate(dateOnly)) return null;
  return daysBetween(calendarDateIn(now(), "UTC"), dateOnly);
}

/** One next action for every renewal, measured against the prototype's Sep 26 snapshot. */
export function renewalTask(row: Renewal, resolution?: RenewalResolution): RenewalTask {
  const baseHref = `/renewals/${row.id}`;
  const decision = resolution?.decision;
  const recorded = decision && !decision.draft ? decision : undefined;
  // With Renewal Decisions on, the clock that matters is decide-by and the
  // person who matters is the decider; off keeps the original fixed offsets.
  const decisionsOn = row.decisionsEnabled;
  const reopened = Boolean(recorded) && !isDecisionCurrent(row, resolution);
  const finalDecision = reopened ? undefined : recorded;
  const accountable = decisionsOn ? row.decider : row.owner;
  const decideDays = decisionsOn ? row.daysToDecideBy : row.daysToCancelBy - 14;
  const assignDays = decisionsOn ? row.daysToDecideBy - LADDER_START_DAYS : row.daysToCancelBy - 30;

  if (finalDecision && isDecisionClosed(finalDecision)) {
    return {
      kind: "done", level: "done", title: "Outcome confirmed",
      description: "The recorded outcome was marked confirmed in Trellis.",
      due: "Completed", status: "Outcome confirmed", statusTone: "green",
      action: "View outcome", href: baseHref, priority: -100,
    };
  }

  if (finalDecision) {
    const days = followUpDays(finalDecision.followUpBy);
    const followUpAfterCancel = days !== null && row.daysToCancelBy >= 0 && days > row.daysToCancelBy;
    const overdue = (days !== null && days < 0) || row.daysToCancelBy < 0;
    const lead = overdue || row.daysToCancelBy <= 7 || followUpAfterCancel || days === null;
    const title = finalDecision.action === "Escalate" ? "Finance review needed" : "Confirm the outcome";
    return {
      kind: "follow-up", level: lead ? "lead" : days !== null && days <= 7 ? "soon" : "upcoming",
      title,
      description: row.daysToCancelBy < 0
        ? "The cancel window has passed. Continue recovery with the vendor and confirm the outcome."
        : followUpAfterCancel
        ? "The follow-up date is after cancel-by. Act before the contract window closes."
        : finalDecision.action === "Escalate"
        ? "Finance needs to make a final decision. Recording an escalation did not notify them."
        : "Complete the vendor or renewal follow-up, then mark the outcome confirmed.",
      due: row.daysToCancelBy < 0 ? "Cancel window missed · recovery follow-up needed"
        : followUpAfterCancel ? `Follow-up after cancel-by · act by ${row.cancelBy}`
        : days === null ? "Set a follow-up date" : shortDue(days, "Follow-up"),
      status: lead ? "Lead attention needed" : finalDecision.action === "Escalate" ? "Finance review pending" : "Outcome pending",
      statusTone: lead ? "red" : "blue", action: "Follow up",
      href: `${baseHref}?task=follow-up`,
      priority: (lead ? 300 : 80) + row.urgency,
    };
  }

  if (!accountable) {
    const days = assignDays;
    const missed = row.daysToCancelBy < 0;
    const lead = missed || row.daysToCancelBy <= 7;
    return {
      kind: "assign", level: lead ? "lead" : days <= 0 ? "overdue" : days <= 7 ? "soon" : "upcoming",
      title: missed ? "Assign a recovery owner" : "Assign an owner",
      description: missed
        ? "The cancel window passed without an owner. Name someone to lead vendor recovery."
        : "A named owner is needed before this renewal can be decided.",
      due: missed ? "Cancel window missed" : shortDue(days, "Assignment"),
      status: lead ? "Lead attention needed" : days <= 0 ? "Owner assignment overdue" : "Owner needed",
      statusTone: lead ? "red" : "orange", action: "Assign owner",
      href: `${baseHref}?task=assign`,
      priority: (lead ? 400 : days <= 0 ? 220 : 60) + row.urgency,
    };
  }

  const days = decideDays;
  const missed = row.daysToCancelBy < 0;
  const lead = missed || row.daysToCancelBy <= 7;
  return {
    kind: "decision", level: lead ? "lead" : days <= 0 ? "overdue" : days <= 7 ? "soon" : "upcoming",
    title: reopened
      ? "Terms changed — review the decision"
      : decision?.draft ? "Complete the draft decision" : missed ? "Choose a recovery path" : "Record a renewal decision",
    description: reopened
      ? `${row.termsChanges.join("; ")}. The earlier decision was made on different terms.`
      : missed
      ? "The notice window passed. Decide whether to negotiate, request goodwill cancellation, or accept the renewal."
      : "Review usage and terms before the cancel-by date; a draft does not count as a decision.",
    due: missed ? "Cancel window missed" : shortDue(days, "Decision"),
    status: lead ? "Lead attention needed" : days <= 0 ? "Decision overdue" : reopened ? "Decision re-opened" : decision?.draft ? "Draft decision" : "Decision needed",
    statusTone: lead ? "red" : days <= 0 ? "orange" : "blue", action: decision?.draft ? "Finish decision" : "Decide renewal",
    href: `${baseHref}?task=decision`,
    priority: (lead ? 350 : days <= 0 ? 180 : 40) + row.urgency,
  };
}
