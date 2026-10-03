"use client";

import { useEffect } from "react";

import { planDigest } from "@/features/renewal-risk/digest";
import { planNudges } from "@/features/renewal-risk/escalation";
import { renewals } from "@/features/renewal-risk/mock-data";
import { useAssessedRenewals } from "@/features/renewal-risk/use-assessed-renewals";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

/**
 * Stands in for the scheduler a backend would run. On every state change it
 * asks the (pure) escalation planner what is due today and "sends" it into the
 * outbox. Re-running is harmless: the planner de-duplicates, so a settled state
 * produces an empty plan and the loop ends.
 */
export function OutboxTicker() {
  const { ready, resolutions, settings, flags, integrations, outbox, today, appendOutbox } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);

  useEffect(() => {
    if (!ready || !flags.renewalDecisions) return;
    const rows = assessed.map(({ slug, row }) => ({ row, resolution: resolutions[slug] }));
    const sentAt = stamp();
    const plan = planNudges({ rows, settings, outbox, integrations, today, sentAt });
    const digest = planDigest({ rows, settings, outbox, integrations, today, sentAt });
    appendOutbox([...plan.entries, ...(digest ? [digest] : [])]);
  }, [ready, flags.renewalDecisions, assessed, resolutions, settings, outbox, integrations, today, appendOutbox]);

  return null;
}
