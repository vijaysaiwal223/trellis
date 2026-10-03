import type { OrgSettings } from "./decision-model";
import { sumByCurrency, type CurrencyTotals } from "./money";
import type { Renewal } from "./types";

export type BlindSpots = {
  /** Notice terms unknown: deadlines are computed from the org's conservative default. */
  noticeMissing: Renewal[];
  /** Total annual value riding on those assumed deadlines, per currency. */
  noticeMissingValue: CurrencyTotals;
  /** Nobody to ask: no decider, so no nudge reaches a person. */
  deciderMissing: Renewal[];
  /** Without a finance lead, escalations from T-14 onwards have nowhere to go. */
  financeLeadMissing: boolean;
  /** Share of tracked contracts with notice terms on file (0-100), or null with no contracts. */
  noticeCoverage: number | null;
  total: number;
};

/**
 * The places the system is guessing or has no one to talk to. These are shown
 * with a dollar figure on purpose: "12 contracts have no notice terms" gets
 * shrugged at, "$212k renews on a guess" doesn't.
 */
export function findBlindSpots(rows: readonly Renewal[], settings: Pick<OrgSettings, "financeLead">): BlindSpots {
  const tracked = rows.filter((row) => !row.inactive);
  const noticeMissing = tracked.filter((row) => row.noticeAssumed);
  const deciderMissing = tracked.filter((row) => row.decider === null);
  return {
    noticeMissing,
    noticeMissingValue: sumByCurrency(noticeMissing.map((row) => ({ amount: row.contractValue, currency: row.currency }))),
    deciderMissing,
    financeLeadMissing: !settings.financeLead,
    noticeCoverage: tracked.length === 0 ? null : Math.round(((tracked.length - noticeMissing.length) / tracked.length) * 100),
    total: noticeMissing.length + deciderMissing.length + (settings.financeLead ? 0 : 1),
  };
}
