import { describe, expect, it } from "vitest";

import type { RenewalResolution } from "@/lib/renewal-runtime-state";

import { assessRenewal } from "./assessment";
import { buildDigest } from "./digest";
import { renewals } from "./mock-data";

const entries = renewals.map((seed) => ({
  row: assessRenewal(seed, seed.owner ?? undefined, []),
}));

const handled: RenewalResolution = {
  decision: {
    action: "Renew",
    note: "",
    recordedAt: "2026-09-26T12:00:00.000Z",
    confirmedAt: "2026-09-27T12:00:00.000Z",
  },
};

describe("buildDigest", () => {
  const digest = buildDigest(entries);

  it("puts each open renewal in one window by its cancel-by", () => {
    expect(digest.pastDeadline.every((entry) => entry.row.daysToCancelBy < 0)).toBe(true);
    expect(digest.dueThisWeek.every((entry) => entry.row.daysToCancelBy >= 0 && entry.row.daysToCancelBy <= 7)).toBe(true);
    expect(digest.next30.every((entry) => entry.row.daysToCancelBy > 7 && entry.row.daysToCancelBy <= 30)).toBe(true);
  });

  it("totals the value of each window", () => {
    const sum = (list: { row: { contractValue: number } }[]) => list.reduce((total, entry) => total + entry.row.contractValue, 0);
    expect(digest.totals.pastDeadlineValue).toBe(sum(digest.pastDeadline));
    expect(digest.totals.dueThisWeekValue).toBe(sum(digest.dueThisWeek));
    expect(digest.totals.next30Value).toBe(sum(digest.next30));
    // With no recorded decisions, every renewal is open.
    expect(digest.totals.openCount).toBe(entries.length);
  });

  it("includes the past-deadline vendor the canvas uses as its missed-deadline example", () => {
    expect(digest.pastDeadline.map((entry) => entry.row.vendor)).toContain("Gong");
  });

  it("leaves out a renewal once its outcome is confirmed", () => {
    const snowflake = entries.find((entry) => entry.row.vendor === "Snowflake")!;
    const closed = buildDigest([{ row: snowflake.row, resolution: handled }]);
    expect(closed.totals.openCount).toBe(0);
  });

  it("lists open renewals without an owner", () => {
    const unownedSeeds = entries.filter((entry) => entry.row.owner === null).length;
    const withoutOwnerOpen = digest.withoutOwner.length;
    expect(withoutOwnerOpen).toBeLessThanOrEqual(unownedSeeds);
    expect(digest.withoutOwner.every((entry) => entry.row.owner === null)).toBe(true);
  });
});
