"use client";

import { Heading } from "@medusajs/ui";
import { useMemo, useState } from "react";

import {
  MetricsSummary,
  RenewalsTable,
  deriveMetrics,
  renewals,
  useAssessedRenewals,
  type MetricKey,
} from "@/features/renewal-risk";

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const assessed = useAssessedRenewals(renewals);
  const metrics = useMemo(() => deriveMetrics(assessed), [assessed]);

  return (
    <div className="flex h-full w-full flex-col overflow-x-auto rounded-[12px] border border-ui-border-base bg-ui-bg-base p-4">
      <Heading
        level="h1"
        className="font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base"
      >
        Renewal Risk
      </Heading>
      <MetricsSummary
        metrics={metrics}
        activeFilter={filterKey}
        onSelectFilter={(key) => setFilterKey((current) => (current === key ? null : key))}
      />
      <RenewalsTable renewals={renewals} filterKey={filterKey} onClearFilter={() => setFilterKey(null)} />
    </div>
  );
}
