"use client";

import { Heading, Input } from "@medusajs/ui";
import { useMemo, useState } from "react";

import {
  MetricsSummary,
  PriorityQueue,
  RenewalsTable,
  deriveMetrics,
  renewals,
  useAssessedRenewals,
  type MetricKey,
} from "@/features/renewal-risk";

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const [query, setQuery] = useState("");
  const assessed = useAssessedRenewals(renewals);
  const metrics = useMemo(() => deriveMetrics(assessed), [assessed]);

  // Metric totals stay computed from the full portfolio — only the table
  // rows below narrow when searching by vendor name.
  const searchedRenewals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? renewals.filter((row) => row.vendor.toLowerCase().includes(q)) : renewals;
  }, [query]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-ui-border-base bg-ui-bg-base p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading
          level="h1"
          className="shrink-0 font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base"
        >
          Renewal Risk
        </Heading>
        <span className="text-[12px] text-ui-fg-muted">Demo contract snapshot · Sep 26, 2026</span>
      </div>
      <div className="shrink-0">
        <MetricsSummary
          metrics={metrics}
          activeFilter={filterKey}
          onSelectFilter={(key) => setFilterKey((current) => (current === key ? null : key))}
        />
      </div>
      <div className="mt-6 flex w-full shrink-0 items-center justify-end gap-3">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search vendor"
          aria-label="Search vendor"
          className="!h-8 !w-[260px] !text-[14px]"
        />
      </div>
      {/* Only this region scrolls — everything above stays put. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!filterKey && !query ? <PriorityQueue items={assessed} /> : null}
        <RenewalsTable
          renewals={searchedRenewals}
          filterKey={filterKey}
          onClearFilter={() => setFilterKey(null)}
        />
      </div>
    </div>
  );
}
