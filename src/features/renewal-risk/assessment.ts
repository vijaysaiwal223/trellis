import { teamOf } from "@/config/people";
import { now } from "@/lib/clock";
import { toVendorSlug } from "@/lib/vendor-slug";

import { calendarDateIn, computeDeadlines, formatShortISO } from "./deadlines";
import { DECISION_BUFFER_DAYS } from "./constants";
import type { ContractType, Renewal, RenewalSeed, Risk } from "./types";

/**
 * Why renewals surprise people: the date that matters is cancel-by (renewal
 * date minus notice period), auto-renew punishes silence, and an unowned tool
 * has nobody watching. Urgency combines exactly those signals, using only
 * fields already in the data model.
 */

// Notice periods run 30/60/90 days, so anything beyond ~60 days out is calm.
const HORIZON_DAYS = 60;
const LARGEST_CONTRACT = 180_000;
const OWNERLESS_MULTIPLIER = 1.25;

// Silence costs money only when the default action is "renew".
const TYPE_WEIGHT: Record<ContractType, number> = {
  "Auto-renew": 1,
  "Month-to-month": 0.6,
  Manual: 0.4,
};

const formatCurrency = (amount: number) => `$${amount.toLocaleString("en-US")}`;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function urgencyScore(input: {
  daysToCancelBy: number;
  contractValue: number;
  contractType: ContractType;
  ownerless: boolean;
}) {
  const time = input.daysToCancelBy < 0 ? 100 : Math.max(0, 100 * (1 - input.daysToCancelBy / HORIZON_DAYS));
  const exposure = Math.min(1, Math.max(0.4, input.contractValue / LARGEST_CONTRACT));
  const raw =
    time * TYPE_WEIGHT[input.contractType] * (0.6 + 0.4 * exposure) * (input.ownerless ? OWNERLESS_MULTIPLIER : 1);
  return Math.min(100, Math.round(raw));
}

export function riskFromScore(score: number): Risk {
  if (score >= 75) return "Critical";
  if (score >= 35) return "High";
  if (score >= 15) return "Medium";
  return "Low";
}

export function formatTiming(days: number): Pick<Renewal, "timing" | "timingTone"> {
  if (days < 0) return { timing: `${plural(-days, "day")} late`, timingTone: "danger" };
  if (days <= 7) return { timing: `${plural(days, "day")} left`, timingTone: "warning" };
  return { timing: `${plural(days, "day")} left` };
}

/** Headline for the cancel-by window, used by the banner and alert feed. */
export function windowHeadline(days: number) {
  if (days < 0) return `Cancel window closed ${plural(-days, "day")} ago`;
  if (days === 0) return "Cancel-by is today";
  return `Cancel-by in ${plural(days, "day")}`;
}

export function assessRenewal(seed: RenewalSeed, assignedOwner?: string): Renewal {
  const owner = assignedOwner ?? seed.owner;
  const ownerless = owner === null;
  const ownerStatus: Renewal["ownerStatus"] = !ownerless
    ? "active"
    : seed.vacancy === "departed"
      ? "departed"
      : "unassigned";

  const today = calendarDateIn(now(), "UTC");
  const deadlines = computeDeadlines({
    renewalDate: seed.renewalDate,
    noticeDays: seed.noticePeriodDays,
    leadTimeDays: DECISION_BUFFER_DAYS,
    today,
  });

  const score = urgencyScore({
    daysToCancelBy: deadlines.daysToCancelBy,
    contractValue: seed.contractValue,
    contractType: seed.contractType,
    ownerless,
  });

  const reasons: string[] = [];
  if (deadlines.daysToCancelBy < 0 || deadlines.daysToCancelBy <= 30) reasons.push(windowHeadline(deadlines.daysToCancelBy));
  if (seed.contractType === "Auto-renew") reasons.push("auto-renews if no one acts");
  if (ownerless) reasons.push(ownerStatus === "departed" ? "owner departed" : "no accountable owner");
  reasons.push(`${formatCurrency(seed.contractValue)} at stake`);

  const year = Number(today.slice(0, 4));

  return {
    ...seed,
    id: toVendorSlug(seed.vendor),
    owner,
    team: ownerless ? null : assignedOwner ? (teamOf(assignedOwner) ?? "Assigned just now") : seed.team,
    formerOwner: seed.formerOwner,
    ownerStatus,
    renewalDate: deadlines.renewalDate,
    noticeDays: seed.noticePeriodDays,
    cancelBy: formatShortISO(deadlines.cancelBy, year),
    cancelByISO: deadlines.cancelBy,
    daysToCancelBy: deadlines.daysToCancelBy,
    decideBy: formatShortISO(deadlines.decideBy, year),
    decideByISO: deadlines.decideBy,
    daysToDecideBy: deadlines.daysToDecideBy,
    contractAmount: formatCurrency(seed.contractValue),
    risk: riskFromScore(score),
    ...formatTiming(deadlines.daysToCancelBy),
    urgency: score,
    reasons,
  };
}
