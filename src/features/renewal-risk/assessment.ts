import { teamOf } from "@/config/people";
import { now } from "@/lib/clock";
import { toVendorSlug } from "@/lib/vendor-slug";

import { calendarDateIn, computeDeadlines, formatShortISO, type ISODate } from "./deadlines";
import { defaultOrgSettings, type OrgSettings, type RenewalResolution } from "./decision-model";
import { formatMoney } from "./money";
import { detectTermsChange, resolveTerms, snapshotOf } from "./terms";
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

export type AssessContext = {
  /** Owner named in this session; wins over the seed's owner. */
  assignedOwner?: string;
  assignedDecider?: string;
  departedOwners?: string[];
  resolution?: RenewalResolution;
  settings?: OrgSettings;
  /** Defaults to on. Off keeps the original cancel-by workflow (no lead time, no decider concept). */
  decisionsEnabled?: boolean;
  /** Calendar date to measure against; defaults to today in the org's time zone. */
  today?: ISODate;
};

export function assessRenewal(seed: RenewalSeed, ctx: AssessContext = {}): Renewal {
  const { assignedOwner, assignedDecider, departedOwners = [], resolution } = ctx;
  const settings = ctx.settings ?? defaultOrgSettings;
  const decisionsEnabled = ctx.decisionsEnabled ?? true;
  const today = ctx.today ?? calendarDateIn(now(), settings.orgTimeZone);
  const currency = seed.currency ?? "USD";

  // Someone who has left the company no longer counts as being in charge.
  // This applies to reassigned owners too: a handoff target can leave as well.
  const currentOwner = assignedOwner ?? seed.owner;
  const departed = currentOwner !== null && departedOwners.includes(currentOwner);
  const owner = departed ? null : currentOwner;
  const ownerless = owner === null;
  const ownerStatus: Renewal["ownerStatus"] = !ownerless
    ? "active"
    : departed || seed.vacancy === "departed"
      ? "departed"
      : "unassigned";

  // The decider defaults to the tool owner until someone else is named.
  const namedDecider = assignedDecider ?? seed.decider ?? null;
  const decider = namedDecider !== null ? (departedOwners.includes(namedDecider) ? null : namedDecider) : owner;
  const deciderStatus: Renewal["deciderStatus"] =
    decider !== null ? "active" : namedDecider !== null && departedOwners.includes(namedDecider) ? "departed" : ownerStatus;

  const terms = resolveTerms(seed, resolution?.terms, settings.defaultNoticeDays);
  const leadTimeDays = decisionsEnabled ? (resolution?.leadTimeOverrideDays ?? settings.leadTimeDays) : 0;
  const deadlines = computeDeadlines({
    renewalDate: terms.renewalDate,
    noticeDays: terms.noticePeriodDays,
    leadTimeDays,
    holidays: settings.holidays,
    today,
    termMonths: seed.termMonths ?? 12,
    autoRenews: seed.contractType !== "Manual",
  });

  const decision = resolution?.decision;
  const termsChanges =
    decisionsEnabled && decision && !decision.draft ? detectTermsChange(decision.termsSnapshot, snapshotOf(terms), currency) : [];

  const score = urgencyScore({
    daysToCancelBy: deadlines.daysToCancelBy,
    contractValue: seed.contractValue,
    contractType: seed.contractType,
    ownerless,
  });

  const reasons: string[] = [];
  if (deadlines.daysToCancelBy < 0 || deadlines.daysToCancelBy <= 30) reasons.push(windowHeadline(deadlines.daysToCancelBy));
  if (decisionsEnabled && deadlines.daysToDecideBy < 0 && deadlines.daysToCancelBy >= 0) {
    reasons.push(`decision overdue by ${plural(-deadlines.daysToDecideBy, "day")}`);
  }
  if (seed.contractType === "Auto-renew") reasons.push("auto-renews if no one acts");
  if (ownerless) reasons.push(ownerStatus === "departed" ? "owner departed" : "no accountable owner");
  if (terms.noticeAssumed) reasons.push(`notice terms unknown, assuming ${terms.noticePeriodDays} days`);
  reasons.push(`${formatMoney(terms.contractValue, currency)} at stake`);

  const refYear = Number(today.slice(0, 4));

  return {
    ...seed,
    id: seed.id ?? toVendorSlug(seed.vendor),
    contractValue: terms.contractValue,
    owner,
    decider,
    deciderStatus,
    team: ownerless ? null : assignedOwner ? (teamOf(assignedOwner) ?? "Assigned just now") : seed.team,
    formerOwner: departed ? (currentOwner ?? undefined) : seed.formerOwner,
    ownerStatus,
    renewalDate: deadlines.renewalDate,
    noticeDays: terms.noticePeriodDays,
    noticeSource: terms.noticeSource,
    noticeAssumed: terms.noticeAssumed,
    cancelBy: formatShortISO(deadlines.cancelBy, refYear),
    cancelByISO: deadlines.cancelBy,
    daysToCancelBy: deadlines.daysToCancelBy,
    decideBy: formatShortISO(deadlines.decideBy, refYear),
    decideByISO: deadlines.decideBy,
    daysToDecideBy: deadlines.daysToDecideBy,
    leadTimeDays,
    decideByShifted: deadlines.decideByShifted,
    decideByShiftReason: deadlines.decideByShiftReason,
    passedRenewals: deadlines.passedRenewals,
    decisionsEnabled,
    termsSnapshot: snapshotOf(terms),
    termsChanges,
    inactive: Boolean(resolution?.inactive),
    contractAmount: formatMoney(terms.contractValue, currency),
    risk: riskFromScore(score),
    ...formatTiming(deadlines.daysToCancelBy),
    urgency: score,
    reasons,
  };
}
