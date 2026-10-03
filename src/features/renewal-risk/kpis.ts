import { calendarDateIn, daysBetween, type ISODate } from "./deadlines";
import type { AnalyticsEvent, RenewalResolution } from "./decision-model";
import type { Renewal } from "./types";
import { isDecisionCurrent } from "./workflow";

export type KpiRow = { row: Renewal; resolution?: RenewalResolution };

export type Kpis = {
  /** Of contracts that have reached cancel-by or been decided, the share decided in time. */
  decidedBeforeDeadline: { percent: number | null; decided: number; total: number };
  /** Renewals that went through with no decision recorded for that cycle. */
  surpriseAutoRenewals: { happened: number; atRisk: number };
  /** Share of tracked contracts whose notice terms are actually on file. */
  noticeCoverage: { percent: number | null; known: number; total: number };
  /** Median days from the first nudge to a recorded decision. */
  medianDaysNudgeToDecision: { days: number | null; sample: number };
};

const recordedDate = (resolution: RenewalResolution | undefined, tz: string): ISODate | null => {
  const at = resolution?.decision?.recordedAt;
  return at ? calendarDateIn(new Date(at), tz) : null;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The four numbers the Renewal Decisions work is judged by. All are derived
 * from state the prototype actually holds (decisions, deadlines, events), so
 * they start empty and fill in as people use it — nothing is seeded.
 */
export function computeKpis(rows: readonly KpiRow[], events: readonly AnalyticsEvent[], today: ISODate, timeZone = "UTC"): Kpis {
  const tracked = rows.filter(({ row }) => !row.inactive);

  let decided = 0;
  let total = 0;
  let happened = 0;
  let atRisk = 0;
  for (const { row, resolution } of tracked) {
    const decision = resolution?.decision;
    const hasDecision = Boolean(decision && !decision.draft);
    const when = recordedDate(resolution, timeZone);
    if (hasDecision || row.daysToCancelBy < 0) {
      total += 1;
      if (hasDecision && when !== null && when <= row.cancelByISO) decided += 1;
    }
    // A renewal date passed on an auto-renewing contract with no decision for that cycle.
    for (const passed of row.passedRenewals) {
      const covered = resolution?.decision && !resolution.decision.draft && resolution.decision.cycle === passed;
      if (!covered && resolution?.outcomes?.[passed] !== "lapsed") happened += 1;
    }
    // Notice window closed, renewal still ahead, nobody decided: it will renew on silence.
    if (row.contractType !== "Manual" && row.daysToCancelBy < 0 && daysBetween(today, row.renewalDate) >= 0 && !(hasDecision && isDecisionCurrent(row, resolution))) {
      atRisk += 1;
    }
  }

  const known = tracked.filter(({ row }) => !row.noticeAssumed).length;

  const firstNudge = new Map<string, string>();
  const firstDecision = new Map<string, string>();
  for (const event of events) {
    if (event.type === "nudge_sent" && !firstNudge.has(event.contractId)) firstNudge.set(event.contractId, event.at);
    if (event.type === "decision_recorded" && !firstDecision.has(event.contractId)) firstDecision.set(event.contractId, event.at);
  }
  const gaps: number[] = [];
  for (const [id, nudgedAt] of firstNudge) {
    const decidedAt = firstDecision.get(id);
    if (!decidedAt) continue;
    const gap = (new Date(decidedAt).getTime() - new Date(nudgedAt).getTime()) / 86_400_000;
    if (gap >= 0) gaps.push(gap);
  }

  return {
    decidedBeforeDeadline: { percent: total === 0 ? null : Math.round((decided / total) * 100), decided, total },
    surpriseAutoRenewals: { happened, atRisk },
    noticeCoverage: { percent: tracked.length === 0 ? null : Math.round((known / tracked.length) * 100), known, total: tracked.length },
    medianDaysNudgeToDecision: { days: median(gaps) === null ? null : Math.round(median(gaps)! * 10) / 10, sample: gaps.length },
  };
}
