import { describe, expect, it } from "vitest";

import { assessRenewal } from "./assessment";
import type { ISODate } from "./deadlines";
import { defaultOrgSettings, type AnalyticsEvent, type RenewalResolution } from "./decision-model";
import { computeKpis } from "./kpis";
import type { RenewalSeed } from "./types";

const seed = (vendor: string, renewalDate: ISODate, noticePeriodDays: number | null): RenewalSeed => ({
  vendor, subtitle: "", logo: "", renewalDate, noticePeriodDays, contractValue: 50_000, contractType: "Auto-renew",
  owner: "Rohan Mehta", team: null, usage: "50%", status: "", statusTone: "grey", action: "",
});

const today: ISODate = "2026-09-26";
const build = (s: RenewalSeed, resolution?: RenewalResolution) => ({
  row: assessRenewal(s, { settings: defaultOrgSettings, resolution, today }),
  resolution,
});

describe("success metrics", () => {
  it("starts empty instead of inventing numbers", () => {
    const kpis = computeKpis([], [], today);
    expect(kpis.decidedBeforeDeadline.percent).toBeNull();
    expect(kpis.medianDaysNudgeToDecision.days).toBeNull();
    expect(kpis.noticeCoverage.percent).toBeNull();
  });

  it("counts a decision made before cancel-by as on time, and silence past it as a miss", () => {
    const onTime = build(seed("OnTime", "2026-12-01", 60), { decision: { action: "Renew", note: "", recordedAt: "2026-09-10T09:00:00Z" } });
    const missed = build(seed("Missed", "2026-10-20", 30));
    const kpis = computeKpis([onTime, missed], [], today);
    expect(kpis.decidedBeforeDeadline).toEqual({ percent: 50, decided: 1, total: 2 });
  });

  it("separates renewals that already happened from those that will on silence", () => {
    const willRenew = build(seed("Soon", "2026-10-20", 30)); // cancel-by Sep 20 passed, renews Oct 20
    const kpis = computeKpis([willRenew], [], today);
    expect(kpis.surpriseAutoRenewals).toEqual({ happened: 0, atRisk: 1 });

    const passed = build(seed("Passed", "2026-09-01", 30));
    expect(passed.row.passedRenewals).toEqual(["2026-09-01"]);
    expect(computeKpis([passed], [], today).surpriseAutoRenewals.happened).toBe(1);
  });

  it("does not count a renewal the team chose to let lapse as a surprise", () => {
    const lapsed = build(seed("Lapsed", "2026-09-01", 30), { outcomes: { "2026-09-01": "lapsed" } });
    expect(computeKpis([lapsed], [], today).surpriseAutoRenewals.happened).toBe(0);
  });

  it("reports notice coverage over tracked contracts only", () => {
    const rows = [build(seed("A", "2026-12-01", 60)), build(seed("B", "2026-12-01", null)), build(seed("C", "2026-12-01", 30), { inactive: true })];
    expect(computeKpis(rows, [], today).noticeCoverage).toEqual({ percent: 50, known: 1, total: 2 });
  });

  it("takes the median days from first nudge to decision", () => {
    const events: AnalyticsEvent[] = [
      { at: "2026-09-01T09:00:00Z", type: "nudge_sent", contractId: "a" },
      { at: "2026-09-03T09:00:00Z", type: "decision_recorded", contractId: "a" },
      { at: "2026-09-01T09:00:00Z", type: "nudge_sent", contractId: "b" },
      { at: "2026-09-09T09:00:00Z", type: "decision_recorded", contractId: "b" },
      { at: "2026-09-02T09:00:00Z", type: "nudge_sent", contractId: "c" },
    ];
    expect(computeKpis([], events, today).medianDaysNudgeToDecision).toEqual({ days: 5, sample: 2 });
  });
});
