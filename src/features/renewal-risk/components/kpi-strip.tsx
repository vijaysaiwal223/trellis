"use client";

import { Text } from "@medusajs/ui";
import { useMemo } from "react";

import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { computeKpis } from "../kpis";
import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";

/** The four numbers this feature is judged by. They start empty and fill in as people use it. */
export function KpiStrip({ renewals }: { renewals: RenewalSeed[] }) {
  const assessed = useAssessedRenewals(renewals);
  const { resolutions, events, today, settings } = useRenewalRuntime();
  const kpis = useMemo(
    () => computeKpis(assessed.map(({ slug, row }) => ({ row, resolution: resolutions[slug] })), events, today, settings.orgTimeZone),
    [assessed, resolutions, events, today, settings.orgTimeZone],
  );

  const items = [
    {
      label: "Decided before notice deadline",
      value: kpis.decidedBeforeDeadline.percent === null ? "—" : `${kpis.decidedBeforeDeadline.percent}%`,
      detail: kpis.decidedBeforeDeadline.total === 0 ? "No contract has reached cancel-by yet" : `${kpis.decidedBeforeDeadline.decided} of ${kpis.decidedBeforeDeadline.total} in time`,
    },
    {
      label: "Surprise auto-renewals",
      value: String(kpis.surpriseAutoRenewals.happened + kpis.surpriseAutoRenewals.atRisk),
      detail: `${kpis.surpriseAutoRenewals.happened} happened · ${kpis.surpriseAutoRenewals.atRisk} will on silence`,
    },
    {
      label: "Contracts with notice terms",
      value: kpis.noticeCoverage.percent === null ? "—" : `${kpis.noticeCoverage.percent}%`,
      detail: `${kpis.noticeCoverage.known} of ${kpis.noticeCoverage.total} on file`,
    },
    {
      label: "Nudge to decision (median)",
      value: kpis.medianDaysNudgeToDecision.days === null ? "—" : kpis.medianDaysNudgeToDecision.days < 1 ? "<1 day" : `${kpis.medianDaysNudgeToDecision.days}d`,
      detail: kpis.medianDaysNudgeToDecision.sample === 0 ? "No decision since a nudge yet" : `${kpis.medianDaysNudgeToDecision.sample} decision${kpis.medianDaysNudgeToDecision.sample === 1 ? "" : "s"}`,
    },
  ];

  return (
    <section aria-label="Success metrics" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3">
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">{item.label}</Text>
          <Text as="span" className="font-heading text-[20px] font-bold leading-7 text-ui-fg-base">{item.value}</Text>
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">{item.detail}</Text>
        </div>
      ))}
    </section>
  );
}
