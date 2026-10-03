import { describe, expect, it } from "vitest";

import { detectTermsChange, resolveTerms, snapshotOf } from "./terms";

const seed = { renewalDate: "2026-12-01", noticePeriodDays: 60, contractValue: 180_000 };

describe("notice terms and their source (#1, #8, #26)", () => {
  it("uses the seed's notice period when it is on file", () => {
    const t = resolveTerms(seed, undefined, 90);
    expect(t).toMatchObject({ noticePeriodDays: 60, noticeSource: "manual", noticeAssumed: false });
  });

  it("applies the labeled conservative default when notice is unknown", () => {
    const t = resolveTerms({ ...seed, noticePeriodDays: null }, undefined, 90);
    expect(t).toMatchObject({ noticePeriodDays: 90, noticeSource: "default", noticeAssumed: true });
  });

  it("lets a confirmed extraction replace the default and records its confidence", () => {
    const t = resolveTerms({ ...seed, noticePeriodDays: null }, {
      noticePeriodDays: 45,
      source: "extracted",
      confidence: 88,
      confirmedAt: "2026-09-26T12:00:00Z",
    }, 90);
    expect(t).toMatchObject({ noticePeriodDays: 45, noticeSource: "extracted", noticeAssumed: false, confidence: 88 });
  });

  it("lets a manual edit override the renewal date and value without touching notice", () => {
    const t = resolveTerms(seed, { renewalDate: "2027-01-15", contractValue: 200_000, source: "manual", confirmedAt: "x" }, 90);
    expect(t).toMatchObject({ renewalDate: "2027-01-15", contractValue: 200_000, noticePeriodDays: 60 });
  });
});

describe("terms changed after a decision (#34)", () => {
  const decidedOn = snapshotOf(resolveTerms(seed, undefined, 90));

  it("reports nothing when the terms are unchanged", () => {
    expect(detectTermsChange(decidedOn, decidedOn)).toEqual([]);
  });

  it("describes a price hike and a moved date", () => {
    const changes = detectTermsChange(decidedOn, { ...decidedOn, contractValue: 216_000, renewalDate: "2026-12-15" });
    expect(changes).toEqual(["Annual value $180,000 → $216,000", "Renewal date 2026-12-01 → 2026-12-15"]);
  });

  it("does nothing for a legacy decision with no snapshot", () => {
    expect(detectTermsChange(undefined, decidedOn)).toEqual([]);
  });
});
