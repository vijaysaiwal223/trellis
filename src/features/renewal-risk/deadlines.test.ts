import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  calendarDateIn,
  computeCancelBy,
  computeDeadlines,
  computeDecideBy,
  currentCycle,
  daysBetween,
  isValidISODate,
  rollBackToBusinessDay,
} from "./deadlines";

describe("deadline arithmetic", () => {
  it("derives cancel-by and decide-by from the spec example (renewal Dec 1, 60-day notice, 14-day lead)", () => {
    const cancelBy = computeCancelBy("2026-12-01", 60);
    expect(cancelBy).toBe("2026-10-02");
    // Oct 2 minus 14 days = Sep 18 (a Friday), so no business-day shift.
    expect(computeDecideBy(cancelBy, 14)).toEqual({ date: "2026-09-18", shifted: false, reason: undefined });
  });

  it("counts calendar days across month and year boundaries", () => {
    expect(daysBetween("2026-12-31", "2027-01-05")).toBe(5);
    expect(daysBetween("2026-09-26", "2026-09-20")).toBe(-6);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("clamps month-end when adding months, including leap years", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("validates ISO dates strictly", () => {
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-9-1")).toBe(false);
    expect(isValidISODate("2026-09-26")).toBe(true);
  });
});

describe("weekend and holiday handling (#30)", () => {
  it("moves a Saturday or Sunday decide-by back to Friday", () => {
    // 2026-09-19 is a Saturday, 2026-09-20 a Sunday.
    expect(rollBackToBusinessDay("2026-09-19")).toEqual({ date: "2026-09-18", shifted: true, reason: "weekend" });
    expect(rollBackToBusinessDay("2026-09-20")).toEqual({ date: "2026-09-18", shifted: true, reason: "weekend" });
  });

  it("never moves a deadline later", () => {
    const rolled = rollBackToBusinessDay("2026-09-20");
    expect(daysBetween(rolled.date, "2026-09-20")).toBeGreaterThan(0);
  });

  it("skips holidays, including a holiday attached to a weekend", () => {
    expect(rollBackToBusinessDay("2026-09-18", ["2026-09-18"])).toEqual({
      date: "2026-09-17",
      shifted: true,
      reason: "holiday",
    });
    expect(rollBackToBusinessDay("2026-09-21", ["2026-09-21", "2026-09-18"]).date).toBe("2026-09-17");
  });

  it("flags a cancel-by that falls on a non-business day without moving it", () => {
    // Renewal Dec 19 (Sat) - 0 notice → cancel-by Dec 19, a Saturday.
    const d = computeDeadlines({
      renewalDate: "2026-12-19",
      noticeDays: 0,
      leadTimeDays: 14,
      today: "2026-09-26",
      termMonths: 12,
      autoRenews: true,
    });
    expect(d.cancelBy).toBe("2026-12-19");
    expect(d.cancelByOnNonBusinessDay).toBe(true);
  });
});

describe("time zones (#31)", () => {
  it("reports today's date in the org timezone, not the machine's", () => {
    const instant = new Date("2026-09-26T03:00:00Z");
    expect(calendarDateIn(instant, "UTC")).toBe("2026-09-26");
    expect(calendarDateIn(instant, "America/Los_Angeles")).toBe("2026-09-25");
    expect(calendarDateIn(instant, "Asia/Kolkata")).toBe("2026-09-26");
    expect(calendarDateIn(new Date("2026-09-26T13:00:00Z"), "Pacific/Auckland")).toBe("2026-09-27");
  });

  it("changes days-remaining when the org timezone puts today on a different date", () => {
    const base = { renewalDate: "2026-12-01", noticeDays: 60, leadTimeDays: 14, termMonths: 12, autoRenews: true };
    const instant = new Date("2026-09-26T03:00:00Z");
    const utc = computeDeadlines({ ...base, today: calendarDateIn(instant, "UTC") });
    const la = computeDeadlines({ ...base, today: calendarDateIn(instant, "America/Los_Angeles") });
    expect(utc.daysToCancelBy).toBe(6);
    expect(la.daysToCancelBy).toBe(7);
  });

  it("falls back to UTC for an unknown timezone instead of throwing", () => {
    expect(calendarDateIn(new Date("2026-09-26T12:00:00Z"), "Not/AZone")).toBe("2026-09-26");
  });
});

describe("deadline already passed (#28)", () => {
  it("reports negative days for a notice window that closed before the contract was added", () => {
    const d = computeDeadlines({
      renewalDate: "2026-10-20",
      noticeDays: 30,
      leadTimeDays: 14,
      today: "2026-09-26",
      termMonths: 12,
      autoRenews: false,
    });
    expect(d.cancelBy).toBe("2026-09-20");
    expect(d.daysToCancelBy).toBe(-6);
    expect(d.daysToDecideBy).toBeLessThan(d.daysToCancelBy);
  });
});

describe("contract cycles (#29, #32)", () => {
  it("rolls an annual auto-renewing contract forward and records the renewal that passed", () => {
    const d = computeDeadlines({
      renewalDate: "2026-09-01",
      noticeDays: 30,
      leadTimeDays: 14,
      today: "2026-09-26",
      termMonths: 12,
      autoRenews: true,
    });
    expect(d.passedRenewals).toEqual(["2026-09-01"]);
    expect(d.renewalDate).toBe("2027-09-01");
  });

  it("does not roll a manual contract — a missed renewal date just stays missed", () => {
    const d = computeDeadlines({
      renewalDate: "2026-09-01",
      noticeDays: 30,
      leadTimeDays: 14,
      today: "2026-09-26",
      termMonths: 12,
      autoRenews: false,
    });
    expect(d.passedRenewals).toEqual([]);
    expect(d.renewalDate).toBe("2026-09-01");
  });

  it("rolls monthly contracts each month without drifting off month-end", () => {
    const cycle = currentCycle("2026-01-31", 1, "2026-03-15");
    expect(cycle.passed).toEqual(["2026-01-31", "2026-02-28"]);
    expect(cycle.renewalDate).toBe("2026-03-31");
  });

  it("keeps a multi-year contract on its single long cycle", () => {
    const cycle = currentCycle("2027-03-31", 36, "2026-09-26");
    expect(cycle.renewalDate).toBe("2027-03-31");
    expect(cycle.passed).toEqual([]);
    // After it passes, the next cycle is three years on.
    expect(currentCycle("2027-03-31", 36, "2027-04-02").renewalDate).toBe("2030-03-31");
  });
});

describe("zero lead time", () => {
  it("keeps decide-by on the notice date itself, even when it falls on a weekend", () => {
    // 2026-10-03 is a Saturday: decide-by stays on the vendor's notice date.
    const d = computeDeadlines({ renewalDate: "2027-01-01", noticeDays: 90, leadTimeDays: 0, today: "2026-10-05" });
    expect(d.cancelBy).toBe("2026-10-03");
    expect(d.decideBy).toBe("2026-10-03");
    expect(d.decideByShifted).toBe(false);
  });
});
