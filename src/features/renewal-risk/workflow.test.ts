import { describe, expect, it } from "vitest";

import type { DecisionAction } from "@/features/renewal-detail/types";
import { needsWrittenNotice } from "@/features/renewal-detail/types";
import type { DecisionRecord, RenewalResolution } from "@/lib/renewal-runtime-state";

import { assessRenewal } from "./assessment";
import { renewals } from "./mock-data";
import { renewalTask } from "./workflow";

const seed = renewals.find((entry) => entry.owner !== null)!;
const row = assessRenewal(seed, seed.owner ?? undefined, []);
const unowned = assessRenewal(renewals.find((entry) => entry.owner === null)!, undefined, []);

function decision(action: DecisionAction, patch: Partial<DecisionRecord> = {}): DecisionRecord {
  return { action, note: "", ownerName: seed.owner ?? undefined, recordedAt: "2026-09-26T12:00:00.000Z", ...patch };
}

describe("needsWrittenNotice", () => {
  it("requires notice only for changes that leave or shrink the contract", () => {
    expect(needsWrittenNotice("Cancel")).toBe(true);
    expect(needsWrittenNotice("Right-size")).toBe(true);
    expect(needsWrittenNotice("Renew")).toBe(false);
    expect(needsWrittenNotice("Renegotiate")).toBe(false);
  });
});

describe("renewalTask through the owner-to-notice flow", () => {
  it("asks for an owner when none is assigned", () => {
    expect(renewalTask(unowned, undefined).kind).toBe("assign");
  });

  it("puts the owner's recommendation in front of finance before any decision", () => {
    const resolution: RenewalResolution = {
      recommendation: { action: "Right-size", targetOutcome: "Reduce to 300 seats", note: "", submittedAt: "2026-09-25T10:00:00.000Z" },
    };
    const task = renewalTask(row, resolution);
    expect(task.kind).toBe("decision");
    expect(task.status).toBe("Recommendation in");
    expect(task.action).toBe("Review recommendation");
  });

  it("asks for written notice after a decision that needs it", () => {
    const task = renewalTask(row, { decision: decision("Cancel") });
    expect(task.kind).toBe("notice");
    expect(task.action).toBe("Send notice");
  });

  it("does not ask for notice once it has been sent", () => {
    const task = renewalTask(row, { decision: decision("Cancel", { noticeSentAt: "2026-09-27T12:00:00.000Z" }) });
    expect(task.kind).toBe("follow-up");
    expect(task.title).toBe("Confirm the vendor's outcome");
  });

  it("skips notice for renewals and renegotiations", () => {
    expect(renewalTask(row, { decision: decision("Renew") }).kind).toBe("follow-up");
    expect(renewalTask(row, { decision: decision("Renegotiate") }).kind).toBe("follow-up");
  });

  it("closes the renewal only once the outcome is confirmed", () => {
    const task = renewalTask(row, {
      decision: decision("Cancel", { noticeSentAt: "2026-09-27T12:00:00.000Z", confirmedAt: "2026-09-28T12:00:00.000Z" }),
    });
    expect(task.kind).toBe("done");
  });
});
