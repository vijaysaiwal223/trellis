import { describe, expect, it } from "vitest";

import type { DecisionRecord, RenewalResolution } from "@/lib/renewal-runtime-state";

import { assessRenewal } from "./assessment";
import { renewals } from "./mock-data";
import { renewalStage } from "./stage";

const open = renewals.find((seed) => seed.owner !== null && seed.vendor !== "Gong")!;
const openRow = assessRenewal(open, open.owner ?? undefined, []);
const unowned = assessRenewal(
  renewals.find((seed) => seed.owner === null && assessRenewal(seed, undefined, []).daysToCancelBy >= 0)!,
  undefined,
  [],
);
const gong = assessRenewal(renewals.find((seed) => seed.vendor === "Gong")!, undefined, []);

const decided = (patch: Partial<DecisionRecord>): RenewalResolution => ({
  decision: { action: "Cancel", note: "", recordedAt: "2026-09-26T12:00:00.000Z", ...patch },
});

describe("renewalStage", () => {
  it("flags renewals with nobody accountable", () => {
    expect(renewalStage(unowned, undefined)).toBe("no-owner");
  });

  it("shows an owned renewal as awaiting the owner until a recommendation arrives", () => {
    expect(renewalStage(openRow, undefined)).toBe("awaiting-owner");
    expect(renewalStage(openRow, { recommendation: { action: "Renew", note: "", submittedAt: "2026-09-25T10:00:00.000Z" } })).toBe("recommendation-in");
  });

  it("marks a missed cancel-by with no decision as locked in", () => {
    expect(gong.daysToCancelBy).toBeLessThan(0);
    expect(renewalStage(gong, undefined)).toBe("locked-in");
  });

  it("waits for notice when a change needs it, and for the outcome after that", () => {
    expect(renewalStage(openRow, decided({ action: "Cancel" }))).toBe("ready-for-notice");
    expect(renewalStage(openRow, decided({ action: "Cancel", noticeSentAt: "2026-09-27T12:00:00.000Z" }))).toBe("awaiting-outcome");
    expect(renewalStage(openRow, decided({ action: "Renew" }))).toBe("awaiting-outcome");
  });

  it("is handled only once the outcome is confirmed", () => {
    expect(renewalStage(openRow, decided({
      action: "Cancel",
      noticeSentAt: "2026-09-27T12:00:00.000Z",
      confirmedAt: "2026-09-28T12:00:00.000Z",
    }))).toBe("handled");
  });

  it("ignores a draft decision", () => {
    expect(renewalStage(openRow, decided({ action: "Cancel", draft: true }))).toBe("awaiting-owner");
  });
});
