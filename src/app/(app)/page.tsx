"use client";

import { Heading } from "@medusajs/ui";
import { RiSearchLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { ViewToggle, type ViewToggleOption } from "@/components/ui/view-toggle";
import {
  MetricsSummary,
  RenewalKanbanBoard,
  RenewalsTable,
  deriveMetrics,
  renewals,
  useAssessedRenewals,
  type MetricKey,
} from "@/features/renewal-risk";

type ViewId = "table" | "kanban";
const viewOptions: ViewToggleOption<ViewId>[] = [
  { id: "table", label: "List", icon: "list" },
  { id: "kanban", label: "Kanban", icon: "kanban" },
];

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const [view, setView] = useState<ViewId>("table");
  const [query, setQuery] = useState("");
  const assessed = useAssessedRenewals(renewals);
  const metrics = useMemo(() => deriveMetrics(assessed), [assessed]);

  // Metric totals stay computed from the full portfolio — only the
  // table/kanban rows below narrow when searching by vendor name.
  const searchedRenewals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? renewals.filter((row) => row.vendor.toLowerCase().includes(q)) : renewals;
  }, [query]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-ui-border-base bg-ui-bg-base p-4">
      <Heading
        level="h1"
        className="shrink-0 font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base"
      >
        Renewal Risk
      </Heading>
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
      <div className="mt-6 flex w-full shrink-0 items-center justify-end gap-3">
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
        <ViewToggle options={viewOptions} value={view} onChange={setView} />
      </div>
      {/* Only this region scrolls — everything above stays put. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === "table" ? (
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
