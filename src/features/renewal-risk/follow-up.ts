import type { DecisionAction } from "@/features/renewal-detail/types";

import { addDays, type ISODate } from "./deadlines";
import type { FollowUpTask } from "./decision-model";
import type { Renewal } from "./types";

export type RuleSuggestion = {
  action: DecisionAction;
  /** The signals behind the suggestion, in plain words. */
  reasons: string[];
  /** The rule, stated so nobody mistakes it for a model's judgement. */
  rule: string;
};

const RULE = "Rule of thumb on seat usage: 80%+ renew, 50–79% downsize to active seats, under 50% cancel. It ignores price and strategy; it's a starting point.";

/**
 * A deterministic suggestion that works without the AI service. It uses one
 * signal (seat usage) and says so — a rule you can read beats a guess you can't.
 */
export function suggestFromUsage(row: Pick<Renewal, "usage" | "daysToCancelBy" | "seats">): RuleSuggestion | null {
  const usage = row.seats ? Math.round((row.seats.active / row.seats.purchased) * 100) : parseInt(row.usage, 10);
  if (!Number.isFinite(usage)) return null;
  const pastNotice = row.daysToCancelBy < 0;
  const seatNote = row.seats ? `${row.seats.active} of ${row.seats.purchased} seats active` : `${usage}% seat usage`;

  if (usage >= 80) {
    return { action: "Renew", reasons: [`${seatNote} (${usage}%)`], rule: RULE };
  }
  if (usage >= 50) {
    return {
      action: "Right-size",
      reasons: [`${seatNote} (${usage}%)`, ...(row.seats ? [`${row.seats.purchased - row.seats.active} seats unused`] : [])],
      rule: RULE,
    };
  }
  return {
    action: "Cancel",
    reasons: [`${seatNote} (${usage}%)`, ...(pastNotice ? ["notice window has passed, so this means asking for goodwill cancellation"] : [])],
    rule: RULE,
  };
}

/** Follow-through steps a decision creates, each with a date that respects the cancel-by deadline. */
export function followUpTasksFor(action: DecisionAction, row: Pick<Renewal, "cancelByISO" | "renewalDate">, today: ISODate): FollowUpTask[] {
  const before = (days: number): ISODate => {
    const target = addDays(row.cancelByISO, -days);
    return target < today ? today : target;
  };
  const afterToday = (days: number): ISODate => addDays(today, days);

  switch (action) {
    case "Cancel":
      return [
        { id: "send-notice", label: "Send the written notice of non-renewal", dueBy: before(3), done: false },
        { id: "get-confirmation", label: "Get the vendor's written confirmation", dueBy: before(0), done: false },
      ];
    case "Renegotiate":
      return [
        { id: "request-quote", label: "Ask the vendor for a revised quote", dueBy: afterToday(5), done: false },
        { id: "agree-terms", label: "Agree the new terms in writing", dueBy: before(7), done: false },
      ];
    case "Right-size":
      return [
        { id: "request-seats", label: "Request the reduced seat count in writing", dueBy: afterToday(5), done: false },
        { id: "confirm-order", label: "Confirm the amended order form", dueBy: before(7), done: false },
      ];
    case "Renew":
      return [{ id: "confirm-renewal", label: "Confirm renewal terms with the vendor", dueBy: before(7), done: false }];
    case "Escalate":
      return [{ id: "finance-review", label: "Finance lead makes the final call", dueBy: before(7), done: false }];
  }
}

/** A notice letter the decider can copy. Anything we do not know is left as a visible placeholder. */
export function noticeLetter(row: Pick<Renewal, "vendor" | "renewalDate" | "cancelByISO">, sender: string | null): string {
  return [
    `Subject: Notice of non-renewal — ${row.vendor}`,
    "",
    `Dear ${row.vendor} team,`,
    "",
    `This letter is formal notice that [Your company legal name] will not renew its agreement with ${row.vendor}, which is due to renew on ${row.renewalDate}.`,
    `We are giving this notice on or before ${row.cancelByISO}, the date the agreement requires. Please confirm in writing that the agreement will end on its current term date and that no further charges will apply.`,
    "",
    "Please send the confirmation to the address below.",
    "",
    "Regards,",
    sender ?? "[Name]",
    "[Title, contact details]",
  ].join("\n");
}
