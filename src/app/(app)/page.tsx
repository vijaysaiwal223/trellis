"use client";

import { Heading } from "@medusajs/ui";
import { RiSearchLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { ViewToggle, type ViewToggleOption } from "@/components/ui/view-toggle";
import {
  BlindSpotsCard,
  DecisionQueue,
  KpiStrip,
  MetricsSummary,
  PriorityQueue,
  QueueFilters,
  defaultQueueFilters,
  type QueueFilterState,
  RenewalKanbanBoard,
  RenewalsTable,
  deriveMetrics,
  renewals,
  useAssessedRenewals,
  type MetricKey,
} from "@/features/renewal-risk";

type ViewId = "queue" | "table" | "kanban";
const viewOptions: ViewToggleOption<ViewId>[] = [
  { id: "table", label: "List", icon: "list" },
  { id: "kanban", label: "Kanban", icon: "kanban" },
];
const decisionViewOptions: ViewToggleOption<ViewId>[] = [{ id: "queue", label: "Decisions", icon: "queue" }, ...viewOptions];

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const [chosenView, setView] = useState<ViewId | null>(null);
  const { flags } = useRenewalRuntime();
  const decisionsOn = flags.renewalDecisions;
  // The decision queue is the home view when Renewal Decisions is on; a choice made here sticks.
  const view: ViewId = decisionsOn ? (chosenView ?? "queue") : chosenView === "queue" || chosenView === null ? "table" : chosenView;
  const [query, setQuery] = useState("");
  const [queueFilters, setQueueFilters] = useState<QueueFilterState>(defaultQueueFilters);
  const { addedContracts } = useRenewalRuntime();
  const seeds = useMemo(() => [...renewals, ...addedContracts], [addedContracts]);
  const assessed = useAssessedRenewals(renewals);
  const metrics = useMemo(() => deriveMetrics(assessed), [assessed]);

  // Metric totals stay computed from the full portfolio — only the
  // table/kanban rows below narrow when searching by vendor name.
  const searchedRenewals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? seeds.filter((row) => row.vendor.toLowerCase().includes(q)) : seeds;
  }, [query, seeds]);

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
      {/* Search + List/Kanban toggle sit directly above the table, as its own
          local header — matches Figma node 189:19990 rather than sharing the
          page-title row. */}
      <div className="mt-6 flex w-full shrink-0 flex-wrap items-center justify-end gap-3">
        {decisionsOn && view === "queue" ? (
          <QueueFilters renewals={seeds} value={queueFilters} onChange={setQueueFilters} />
        ) : null}
        <div className="flex h-8 w-[260px] items-center gap-2 rounded-[8px] bg-ui-bg-subtle-hover px-2">
          <RiSearchLine className="size-4 shrink-0 text-ui-fg-muted" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendor"
            className="w-full bg-transparent text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </div>
        <ViewToggle options={decisionsOn ? decisionViewOptions : viewOptions} value={view} onChange={setView} />
      </div>
      {/* Only this region scrolls — everything above stays put. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {decisionsOn && !filterKey && !query ? (
          <div className="mt-5 flex flex-col gap-3">
            <KpiStrip renewals={renewals} />
            <BlindSpotsCard renewals={renewals} />
          </div>
        ) : null}
        {!filterKey && !query && view !== "queue" ? <PriorityQueue items={assessed} /> : null}
        {view === "queue" ? (
          <DecisionQueue renewals={searchedRenewals} filters={queueFilters} />
        ) : view === "table" ? (
          <RenewalsTable
            renewals={searchedRenewals}
            filterKey={filterKey}
            onClearFilter={() => setFilterKey(null)}
          />
        ) : (
          <RenewalKanbanBoard renewals={searchedRenewals} filterKey={filterKey} />
        )}
      </div>
    </div>
  );
}
