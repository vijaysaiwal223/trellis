"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { renewalTableHeaders } from "../constants";
import { matchesMetric, type MetricKey } from "../metrics";
import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewalStage, type RenewalStage } from "../stage";
import { renewalTask } from "../workflow";

import { RenewalRow } from "./renewal-row";
import { AllClear, type UpcomingRenewal } from "./all-clear";

type RenewalsTableProps = {
  renewals: RenewalSeed[];
  filterKey?: MetricKey | null;
  onClearFilter?: () => void;
  /** Keeps only renewals whose stage passes, for the queue's status tabs. */
  stageMatch?: (stage: RenewalStage) => boolean;
  /** The renewal whose assign drawer is open, highlighted in the table. */
  selectedId?: string | null;
  onAssign?: (id: string) => void;
  onOpen?: (id: string) => void;
  /** Open renewals beyond this view, for the all-clear panel. */
  upcoming?: UpcomingRenewal[];
};

type Entry = ReturnType<typeof useAssessedRenewals>[number];

// Windows are measured to cancel-by, the last day the contract can still change.
// Checked in order, so each renewal lands in the first window it fits.
const windowGroups: { key: string; label: string; fits: (daysToCancelBy: number) => boolean }[] = [
  { key: "past", label: "Past deadline", fits: (days) => days < 0 },
  { key: "week", label: "Due this week", fits: (days) => days <= 7 },
  { key: "month", label: "Due in 30 days", fits: (days) => days <= 30 },
  { key: "later", label: "Later", fits: () => true },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Column widths from the design. The owner column takes whatever width is left.
const columnWidth = ["w-[200px]", "w-[104px]", "w-[200px]", "w-[112px]", "w-[120px]", "w-[64px]", "min-w-[100px] flex-1", "w-[152px]", "w-[100px]"];
const rightAligned = new Set(["Annual value", "YoY"]);

export function RenewalsTable({ renewals, filterKey, onClearFilter, stageMatch, selectedId, onAssign, onOpen, upcoming = [] }: RenewalsTableProps) {
  const assessed = useAssessedRenewals(renewals);
  const { resolutions } = useRenewalRuntime();

  // Rank the next action, including overdue follow-up after a decision.
  const rows = useMemo(() => {
    const byMetric = filterKey ? assessed.filter((entry) => matchesMetric(filterKey, entry)) : assessed;
    const scoped = stageMatch
      ? byMetric.filter((entry) => stageMatch(renewalStage(entry.row, resolutions[entry.slug])))
      : byMetric;
    return [...scoped].sort((a, b) =>
      renewalTask(b.row, resolutions[b.slug]).priority - renewalTask(a.row, resolutions[a.slug]).priority,
    );
  }, [assessed, filterKey, resolutions, stageMatch]);

  // Unfiltered, the queue reads as time windows so the urgent groups sit on top.
  const groups = useMemo(() => {
    if (filterKey) return null;
    const buckets = windowGroups.map((group) => ({ ...group, entries: [] as Entry[] }));
    for (const entry of rows) {
      buckets.find((bucket) => bucket.fits(entry.row.daysToCancelBy))!.entries.push(entry);
    }
    return buckets.filter((bucket) => bucket.entries.length > 0);
  }, [rows, filterKey]);

  const renderRows = (entries: Entry[]) =>
    entries.map(({ row }) => (
      <RenewalRow
        key={row.id}
        row={row}
        selected={row.id === selectedId}
        onAssign={onAssign ? () => onAssign(row.id) : undefined}
        onOpen={onOpen ? () => onOpen(row.id) : undefined}
      />
    ));

  return (
    <div className="flex w-full flex-col gap-[12px]">
      {filterKey ? (
        <div className="flex items-center justify-between rounded-[8px] border border-solid border-[#e4e4e7] bg-[#f4f4f5] px-[12px] py-[8px]">
          <span className="text-[14px] text-[#52525b]">
            Showing {rows.length} filtered renewal{rows.length === 1 ? "" : "s"}
          </span>
          <Button variant="secondary" size="small" onClick={onClearFilter}>
            Clear filter
          </Button>
        </div>
      ) : null}
      <div className="w-full overflow-x-auto">
        <div className="flex min-w-[1152px] flex-col items-start overflow-clip rounded-[12px] border border-solid border-[#e4e4e7]">
          <div className="flex w-full items-start overflow-clip bg-[#fafafa]">
            {renewalTableHeaders.map((header, index) => (
              <div
                key={header}
                className={`flex shrink-0 flex-col items-start overflow-clip border-b border-solid border-[#e4e4e7] py-[10px] ${columnWidth[index]} ${
                  header === "Status" ? "px-[8px]" : "px-[12px]"
                } ${rightAligned.has(header) ? "items-end" : ""}`}
              >
                <span className="whitespace-nowrap text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">{header}</span>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            filterKey ? (
              <div className="flex h-24 w-full items-center justify-center text-[14px] text-[#71717a]">No renewals match this filter.</div>
            ) : (
              <div className="p-[12px]">
                <AllClear upcoming={upcoming} />
              </div>
            )
          ) : groups ? (
            groups.map((group) => {
              const open = group.entries.filter((entry) => renewalTask(entry.row, resolutions[entry.slug]).kind !== "done");
              const handled = group.entries.length - open.length;
              const atStake = open.reduce((sum, entry) => sum + entry.row.contractValue, 0);
              const past = group.key === "past";
              const week = group.key === "week";
              return (
                <div key={group.key} className="flex w-full flex-col">
                  <div className="flex w-full items-start gap-[12px] border-b border-solid border-[#e4e4e7] bg-[#f4f4f5] px-[12px] py-[10px] text-[14px] leading-[20px] tracking-[-0.07px]">
                    <span
                      className={`whitespace-nowrap ${past ? "text-[#9f1239]" : week ? "text-[#9a3412]" : "text-[#18181b]"}`}
                    >
                      {group.label}
                    </span>
                    <span className="whitespace-nowrap text-[#18181b]">
                      {open.length} open{handled > 0 ? ` · ${handled} handled` : ""} · {usd.format(atStake)} at stake
                      {past ? " · renewing regardless" : ""}
                    </span>
                  </div>
                  {renderRows(group.entries)}
                </div>
              );
            })
          ) : (
            renderRows(rows)
          )}
        </div>
      </div>
    </div>
  );
}
