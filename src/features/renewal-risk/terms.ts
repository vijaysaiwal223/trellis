import type { ISODate } from "./deadlines";
import type { NoticeSource, TermsOverride, TermsSnapshot } from "./decision-model";
import { formatMoney } from "./money";

export type SeedTerms = {
  renewalDate: ISODate;
  /** null = the contract's notice terms are not on file. */
  noticePeriodDays: number | null;
  noticeSource?: NoticeSource;
  contractValue: number;
};

export type EffectiveTerms = {
  renewalDate: ISODate;
  contractValue: number;
  noticePeriodDays: number;
  noticeSource: NoticeSource;
  /** True when the notice period is the org's conservative default, not a known term. */
  noticeAssumed: boolean;
  confidence?: number;
};

/**
 * Seed terms, then any confirmed override (manual edit or extracted-and-
 * confirmed), then — only if the notice period is still unknown — the org's
 * conservative default, clearly marked as assumed.
 */
export function resolveTerms(seed: SeedTerms, override: TermsOverride | undefined, defaultNoticeDays: number): EffectiveTerms {
  const renewalDate = override?.renewalDate ?? seed.renewalDate;
  const contractValue = override?.contractValue ?? seed.contractValue;

  if (override?.noticePeriodDays !== undefined) {
    return {
      renewalDate,
      contractValue,
      noticePeriodDays: override.noticePeriodDays,
      noticeSource: override.source,
      noticeAssumed: false,
      confidence: override.confidence,
    };
  }
  if (seed.noticePeriodDays !== null) {
    return {
      renewalDate,
      contractValue,
      noticePeriodDays: seed.noticePeriodDays,
      noticeSource: seed.noticeSource ?? "manual",
      noticeAssumed: false,
    };
  }
  return { renewalDate, contractValue, noticePeriodDays: defaultNoticeDays, noticeSource: "default", noticeAssumed: true };
}

export function snapshotOf(terms: EffectiveTerms): TermsSnapshot {
  return {
    contractValue: terms.contractValue,
    renewalDate: terms.renewalDate,
    noticePeriodDays: terms.noticePeriodDays,
  };
}

/**
 * Human-readable differences between the terms a decision was made on and the
 * terms today. Any difference re-opens the decision (#34) — a price hike or a
 * moved date can change the right answer.
 */
export function detectTermsChange(before: TermsSnapshot | undefined, after: TermsSnapshot, currency = "USD"): string[] {
  if (!before) return [];
  const changes: string[] = [];
  if (before.contractValue !== after.contractValue) {
    changes.push(`Annual value ${formatMoney(before.contractValue, currency)} → ${formatMoney(after.contractValue, currency)}`);
  }
  if (before.renewalDate !== after.renewalDate) {
    changes.push(`Renewal date ${before.renewalDate} → ${after.renewalDate}`);
  }
  if (before.noticePeriodDays !== after.noticePeriodDays) {
    changes.push(`Notice period ${before.noticePeriodDays} → ${after.noticePeriodDays} days`);
  }
  return changes;
}
