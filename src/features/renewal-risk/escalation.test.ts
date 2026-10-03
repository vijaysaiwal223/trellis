import { describe, expect, it } from "vitest";

import { defaultIntegrations } from "@/config/integrations";

import { assessRenewal } from "./assessment";
import type { ISODate } from "./deadlines";
import { defaultOrgSettings, type OrgSettings, type OutboxEntry, type RenewalResolution } from "./decision-model";
import { ladderFor, mintToken, planNudges, validateToken } from "./escalation";
import type { RenewalSeed } from "./types";

/** The scenario from the Renewal Decisions spec: renews Dec 1, 60 days' notice, an admin owns it. */
const salesforce: RenewalSeed = {
  vendor: "Salesforce",
  subtitle: "CRM",
  logo: "",
  renewalDate: "2026-12-01",
  noticePeriodDays: 60,
  contractValue: 180_000,
  contractType: "Auto-renew",
  owner: "Rohan Mehta",
  team: "Engineering",
  usage: "64%",
  status: "",
  statusTone: "grey",
  action: "",
};

const settings: OrgSettings = { ...defaultOrgSettings, financeLead: "Jasmine Patel" };

/** Replays the engine on `today`, carrying the outbox forward like the app does. */
function day(today: ISODate, opts: { resolution?: RenewalResolution; outbox?: OutboxEntry[]; settings?: OrgSettings; seed?: RenewalSeed } = {}) {
  const useSettings = opts.settings ?? settings;
  const row = assessRenewal(opts.seed ?? salesforce, { settings: useSettings, resolution: opts.resolution, today });
  const plan = planNudges({
    rows: [{ row, resolution: opts.resolution }],
    settings: useSettings,
    outbox: opts.outbox ?? [],
    integrations: defaultIntegrations(),
    today,
    sentAt: `${today}T09:00:00Z`,
  });
  return { row, ...plan };
}

const names = (entries: OutboxEntry[]) => entries.map((entry) => `${entry.step}:${entry.recipient}`);

describe("Salesforce replay (spec scenario)", () => {
  it("derives the spec's deadlines", () => {
    const { row } = day("2026-08-01");
    expect(row.cancelByISO).toBe("2026-10-02");
    expect(row.decideByISO).toBe("2026-09-18");
  });

  it("lays out the ladder at T-30 / T-14 / T-7 from decide-by", () => {
    const ladder = ladderFor("2026-09-18");
    expect(ladder.map((entry) => entry.date)).toEqual(["2026-08-19", "2026-09-04", "2026-09-11", "2026-09-18", "2026-09-21"]);
  });

  it("walks the whole ladder, day by day, with nobody acting", () => {
    let outbox: OutboxEntry[] = [];
    const sentOn: Record<string, string[]> = {};
    for (const today of ["2026-08-18", "2026-08-19", "2026-09-04", "2026-09-11", "2026-09-18", "2026-09-21"] as ISODate[]) {
      const { entries } = day(today, { outbox });
      sentOn[today] = names(entries);
      outbox = [...outbox, ...entries];
    }
    expect(sentOn).toEqual({
      "2026-08-18": [],
      "2026-08-19": ["t30:Rohan Mehta"],
      // Nobody acknowledged T-30, so the finance lead is pulled in at T-14.
      "2026-09-04": ["t14:Rohan Mehta", "t14:Jasmine Patel"],
      "2026-09-11": ["t7:Rohan Mehta", "t7:Jasmine Patel"],
      "2026-09-18": ["deadline:Rohan Mehta", "deadline:Jasmine Patel"],
      "2026-09-21": ["missed:Rohan Mehta", "missed:Jasmine Patel"],
    });
  });

  it("keeps T-14 to the decider alone when T-30 was acknowledged", () => {
    const first = day("2026-08-19");
    const { entries } = day("2026-09-04", { outbox: first.entries, resolution: { acks: { t30: "2026-08-19T10:00:00Z" } } });
    expect(names(entries)).toEqual(["t14:Rohan Mehta"]);
  });
});

describe("escalation timing", () => {
  it("is idempotent: re-running the same day sends nothing new", () => {
    const first = day("2026-09-04");
    const again = day("2026-09-04", { outbox: first.entries });
    expect(first.entries.length).toBeGreaterThan(0);
    expect(again.entries).toEqual([]);
  });

  it("after a gap, sends only the latest due step, not a burst of stale ones", () => {
    const { entries } = day("2026-09-12");
    expect(entries.map((entry) => entry.step)).toEqual(["t7", "t7"]);
  });

  it("rolls a step that lands on a weekend back to Friday", () => {
    // Decide-by Mon Oct 12 → T-7 is Mon Oct 5, T-14 Mon Sep 28; T-30 Sat Sep 12 rolls to Fri Sep 11.
    const ladder = ladderFor("2026-10-12");
    expect(ladder[0].date).toBe("2026-09-11");
  });

  it("holds a snooze against early steps but never against decide-by day", () => {
    const snoozed: RenewalResolution = { snooze: { until: "2026-09-30", count: 1 } };
    expect(day("2026-09-11", { resolution: snoozed }).entries).toEqual([]);
    expect(day("2026-09-18", { resolution: snoozed }).entries.length).toBeGreaterThan(0);
  });

  it("falls back to email unless Slack or Teams is connected for that audience", () => {
    expect(day("2026-08-19").entries[0].channel).toBe("email");
  });
});

describe("notifications stop after a decision", () => {
  const decided: RenewalResolution = {
    decision: { action: "Renew", note: "", cycle: "2026-12-01", recordedAt: "2026-09-02T09:00:00Z" },
  };

  it("sends nothing once a decision is recorded", () => {
    expect(day("2026-09-11", { resolution: decided }).entries).toEqual([]);
    expect(day("2026-09-21", { resolution: decided }).entries).toEqual([]);
  });

  it("does not treat a draft as a decision", () => {
    const draft: RenewalResolution = { decision: { ...decided.decision!, draft: true } };
    expect(day("2026-09-11", { resolution: draft }).entries.length).toBeGreaterThan(0);
  });

  it("hands the thread to the finance lead after an escalation, and only them", () => {
    const escalated: RenewalResolution = { decision: { ...decided.decision!, action: "Escalate" } };
    expect(names(day("2026-09-11", { resolution: escalated }).entries)).toEqual(["t7:Jasmine Patel"]);
  });

  it("resumes when the terms change after the decision (the decision is re-opened)", () => {
    const withSnapshot: RenewalResolution = {
      decision: { ...decided.decision!, termsSnapshot: { contractValue: 180_000, renewalDate: "2026-12-01", noticePeriodDays: 60 } },
      terms: { contractValue: 216_000, source: "manual", confirmedAt: "2026-09-05T09:00:00Z" },
    };
    expect(day("2026-09-11", { resolution: withSnapshot }).row.termsChanges.length).toBe(1);
    expect(day("2026-09-11", { resolution: withSnapshot }).entries.length).toBeGreaterThan(0);
  });

  it("stops for contracts marked inactive", () => {
    expect(day("2026-09-11", { resolution: { inactive: true } }).entries).toEqual([]);
  });
});

describe("recipients and limits", () => {
  it("falls back to the finance lead when the contract has no decider", () => {
    const ownerless: RenewalSeed = { ...salesforce, owner: null, vacancy: "unassigned" };
    expect(names(day("2026-08-19", { seed: ownerless }).entries)).toEqual(["t30:Jasmine Patel"]);
  });

  it("reports a held nudge when there is nobody to send it to", () => {
    const ownerless: RenewalSeed = { ...salesforce, owner: null, vacancy: "unassigned" };
    const result = day("2026-08-19", { seed: ownerless, settings: { ...settings, financeLead: null } });
    expect(result.entries).toEqual([]);
    expect(result.held[0]).toMatchObject({ reason: "no-recipient" });
  });

  it("holds back nudges beyond a person's daily limit, most urgent first", () => {
    const make = (vendor: string, renewalDate: ISODate): RenewalSeed => ({ ...salesforce, vendor, renewalDate });
    const seeds = [make("A", "2026-12-01"), make("B", "2026-12-08"), make("C", "2026-12-15")];
    const today: ISODate = "2026-09-21";
    const limited: OrgSettings = { ...settings, financeLead: null, dailyNudgeLimit: 2 };
    const rows = seeds.map((seed) => ({ row: assessRenewal(seed, { settings: limited, today }) }));
    const plan = planNudges({ rows, settings: limited, outbox: [], integrations: defaultIntegrations(), today, sentAt: `${today}T09:00:00Z` });
    expect(plan.entries).toHaveLength(2);
    expect(plan.held.filter((entry) => entry.reason === "daily-limit")).toHaveLength(1);
    // A is the most urgent, so it is never the one held back.
    expect(plan.entries.map((entry) => entry.vendor)).toContain("A");
  });

  it("doesn't count the weekly digest against a person's daily limit", () => {
    const digest: OutboxEntry = {
      id: "digest:2026-09-21:Jasmine Patel", contractId: "digest", vendor: "All renewals", step: "digest", recipient: "Rohan Mehta",
      role: "finance-lead", channel: "email", scheduledFor: "2026-09-21", sentAt: "2026-08-19T08:00:00Z", token: "t", subject: "Digest",
    };
    const tight: OutboxEntry[] = [digest];
    const result = day("2026-08-19", { outbox: tight, settings: { ...settings, dailyNudgeLimit: 1 } });
    expect(result.entries).toHaveLength(1);
  });

  it("does nothing at all when Renewal Decisions is off", () => {
    const row = assessRenewal(salesforce, { settings, today: "2026-09-11", decisionsEnabled: false });
    const plan = planNudges({ rows: [{ row }], settings, outbox: [], integrations: defaultIntegrations(), today: "2026-09-11", sentAt: "2026-09-11T09:00:00Z" });
    expect(plan.entries).toEqual([]);
  });
});

describe("one-click link permissions", () => {
  const first = day("2026-08-19");
  const entry = first.entries[0];

  it("accepts a link that was issued for this contract", () => {
    expect(validateToken(entry.token, "salesforce", [])).toMatchObject({ status: "unknown" });
    expect(validateToken(entry.token, entry.contractId, first.entries)).toMatchObject({ status: "valid" });
  });

  it("rejects a missing link", () => {
    expect(validateToken(null, entry.contractId, first.entries).status).toBe("missing");
  });

  it("rejects a tampered link", () => {
    const tampered = entry.token.replace(/\.[^.]+$/, ".abc");
    expect(validateToken(tampered, entry.contractId, first.entries).status).toBe("forged");
  });

  it("rejects a link minted outside the outbox", () => {
    const stray = mintToken("salesforce", "t30", "Someone Else");
    expect(validateToken(stray, "salesforce", first.entries).status).toBe("unknown");
  });

  it("rejects a link used on a different contract", () => {
    expect(validateToken(entry.token, "zoom", first.entries).status).toBe("wrong-contract");
  });

  it("rejects a link that was already used", () => {
    const used = first.entries.map((candidate) => ({ ...candidate, usedAt: "2026-08-19T10:00:00Z" }));
    expect(validateToken(entry.token, entry.contractId, used).status).toBe("used");
  });
});
