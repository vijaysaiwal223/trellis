import { describe, expect, it } from "vitest";

import { defaultIntegrations } from "@/config/integrations";

import { assessRenewal } from "./assessment";
import type { ISODate } from "./deadlines";
import { defaultOrgSettings, type OrgSettings } from "./decision-model";
import { buildDigest, planDigest, weekStart } from "./digest";
import { followUpTasksFor, noticeLetter, suggestFromUsage } from "./follow-up";
import type { RenewalSeed } from "./types";

const base: RenewalSeed = {
  vendor: "Acme", subtitle: "", logo: "", renewalDate: "2026-12-01", noticePeriodDays: 60, contractValue: 90_000,
  contractType: "Auto-renew", owner: "Rohan Mehta", team: null, usage: "40%", status: "", statusTone: "grey", action: "",
};
const settings: OrgSettings = { ...defaultOrgSettings, financeLead: "Jasmine Patel" };
const today: ISODate = "2026-09-26";
const rows = (...seeds: RenewalSeed[]) => seeds.map((seed) => ({ row: assessRenewal(seed, { settings, today }) }));

describe("weekly finance digest", () => {
  it("finds the Monday of the week", () => {
    expect(weekStart("2026-09-26")).toBe("2026-09-21"); // Saturday
    expect(weekStart("2026-09-27")).toBe("2026-09-21"); // Sunday
    expect(weekStart("2026-09-21")).toBe("2026-09-21");
  });

  it("puts overdue, soon and blind spots in separate sections, with money per currency", () => {
    const digest = buildDigest(
      rows(
        base, // decide-by Sep 18: overdue
        { ...base, vendor: "Beta", renewalDate: "2027-01-31", noticePeriodDays: null, currency: "EUR", contractValue: 20_000 },
      ),
      settings,
      today,
    );
    const titles = digest.sections.map((section) => section.title);
    expect(titles[0]).toMatch(/^Overdue to decide/);
    expect(titles.at(-1)).toBe("Blind spots");
    expect(digest.sections.at(-1)!.lines[0]).toContain("€20,000");
    expect(digest.body).toContain("Acme — decide by Sep 18");
  });

  it("sends one digest per week and not again unless forced", () => {
    const input = { rows: rows(base), settings, outbox: [], integrations: defaultIntegrations(), today, sentAt: "2026-09-26T09:00:00Z" };
    const first = planDigest(input)!;
    expect(first).toMatchObject({ step: "digest", recipient: "Jasmine Patel", scheduledFor: "2026-09-21" });
    expect(planDigest({ ...input, outbox: [first] })).toBeNull();
    expect(planDigest({ ...input, outbox: [first], force: true })).not.toBeNull();
  });

  it("has nobody to send to without a finance lead", () => {
    expect(planDigest({ rows: rows(base), settings: { ...settings, financeLead: null }, outbox: [], integrations: defaultIntegrations(), today, sentAt: "x" })).toBeNull();
  });
});

describe("suggestions and follow-through", () => {
  it("suggests by seat usage and states the rule", () => {
    expect(suggestFromUsage({ usage: "90%", daysToCancelBy: 40 })!.action).toBe("Renew");
    expect(suggestFromUsage({ usage: "65%", daysToCancelBy: 40 })!.action).toBe("Right-size");
    const cancel = suggestFromUsage({ usage: "30%", daysToCancelBy: -3 })!;
    expect(cancel.action).toBe("Cancel");
    expect(cancel.reasons.join(" ")).toContain("goodwill");
    expect(cancel.rule).toContain("Rule of thumb");
  });

  it("makes no suggestion when usage is unknown", () => {
    expect(suggestFromUsage({ usage: "—", daysToCancelBy: 40 })).toBeNull();
  });

  it("schedules cancellation tasks before cancel-by, never in the past", () => {
    const row = assessRenewal(base, { settings, today });
    const tasks = followUpTasksFor("Cancel", row, today);
    expect(tasks.map((task) => task.id)).toEqual(["send-notice", "get-confirmation"]);
    // Cancel-by Oct 2 is 6 days out: the notice is due Sep 29, the confirmation on cancel-by day.
    expect(tasks.map((task) => task.dueBy)).toEqual(["2026-09-29", "2026-10-02"]);
    const late = assessRenewal({ ...base, renewalDate: "2026-10-20", noticePeriodDays: 30 }, { settings, today });
    expect(followUpTasksFor("Cancel", late, today).every((task) => task.dueBy! >= today)).toBe(true);
  });

  it("leaves unknown letter fields as visible placeholders", () => {
    const row = assessRenewal(base, { settings, today });
    const letter = noticeLetter(row, null);
    expect(letter).toContain("[Your company legal name]");
    expect(letter).toContain("2026-10-02");
    expect(noticeLetter(row, "Rohan Mehta")).toContain("Rohan Mehta");
  });
});
