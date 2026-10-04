import { needsWrittenNotice } from "@/features/renewal-detail/types";
import { isDecisionClosed, type RenewalResolution } from "@/lib/renewal-runtime-state";

import type { Renewal } from "./types";

/**
 * Where a renewal sits in the flow, from the queue's point of view. One stage per
 * renewal, so the status tabs and the digest never disagree about an item.
 */
export type RenewalStage =
  | "no-owner"
  | "awaiting-owner"
  | "recommendation-in"
  | "locked-in"
  | "ready-for-notice"
  | "awaiting-outcome"
  | "handled";

export const stageLabel: Record<RenewalStage, string> = {
  "no-owner": "No owner",
  "awaiting-owner": "Awaiting owner",
  "recommendation-in": "Recommendation in",
  "locked-in": "Locked in",
  "ready-for-notice": "Ready for notice",
  "awaiting-outcome": "Awaiting outcome",
  handled: "Handled",
};

export function renewalStage(row: Renewal, resolution?: RenewalResolution): RenewalStage {
  const decision = resolution?.decision && !resolution.decision.draft ? resolution.decision : undefined;
  if (decision && isDecisionClosed(decision)) return "handled";
  if (decision) {
    return needsWrittenNotice(decision.action) && !decision.noticeSentAt ? "ready-for-notice" : "awaiting-outcome";
  }
  // Past cancel-by with no decision: the contract renews on its own terms.
  if (row.daysToCancelBy < 0) return "locked-in";
  if (resolution?.recommendation) return "recommendation-in";
  if (!row.owner) return "no-owner";
  return "awaiting-owner";
}

export function isOpenStage(stage: RenewalStage): boolean {
  return stage !== "handled";
}
