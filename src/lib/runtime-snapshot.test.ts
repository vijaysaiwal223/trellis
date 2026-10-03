import { describe, expect, it } from "vitest";

import { defaultOrgSettings } from "@/features/renewal-risk/decision-model";
import { isDecisionClosed } from "@/features/renewal-risk/decision-model";

import { parseSnapshot } from "./runtime-snapshot";

describe("storage migration (v1 → v2)", () => {
  // A snapshot exactly as the original app wrote it.
  const v1 = JSON.stringify({
    resolutions: {
      slack: {
        decision: { action: "Right-size", note: "Cut seats", ownerName: "Sarah Chen", recordedAt: "2026-09-20T10:00:00.000Z", confirmedAt: "2026-09-22T10:00:00.000Z" },
        history: [{ at: "2026-09-20T10:00:00.000Z", label: "Decision recorded", action: "Right-size", ownerName: "Sarah Chen" }],
      },
    },
    departedOwners: ["Elena Chen"],
    autoHandoff: false,
    integrations: { slack: { connected: true, channel: "#x", dmOwners: true, postEscalations: false } },
  });

  it("keeps every v1 field and decision exactly as saved", () => {
    const snapshot = parseSnapshot(v1);
    expect(snapshot.departedOwners).toEqual(["Elena Chen"]);
    expect(snapshot.autoHandoff).toBe(false);
    expect(snapshot.integrations?.slack.connected).toBe(true);
    expect(snapshot.resolutions?.slack.decision?.action).toBe("Right-size");
    expect(snapshot.resolutions?.slack.history).toHaveLength(1);
  });

  it("leaves the new fields undefined so defaults apply, and old decisions still close", () => {
    const snapshot = parseSnapshot(v1);
    expect(snapshot.settings).toBeUndefined();
    expect(snapshot.outbox).toBeUndefined();
    expect(isDecisionClosed(snapshot.resolutions!.slack.decision!)).toBe(true);
  });

  it("fills missing settings from defaults when only some were saved", () => {
    const snapshot = parseSnapshot(JSON.stringify({ settings: { leadTimeDays: 21 } }));
    expect(snapshot.settings).toEqual({ ...defaultOrgSettings, leadTimeDays: 21 });
  });

  it("ignores fields of the wrong type instead of crashing", () => {
    const snapshot = parseSnapshot(JSON.stringify({ resolutions: [], departedOwners: [1, "A"], autoHandoff: "yes", outbox: {} }));
    expect(snapshot).toEqual({ departedOwners: ["A"] });
  });
});
