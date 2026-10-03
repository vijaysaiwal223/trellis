"use client";

import { Avatar, Text, clx } from "@medusajs/ui";
import Link from "next/link";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine, RiFilter3Line } from "@remixicon/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { actionLabel } from "@/features/renewal-detail/types";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { formatMoney } from "../money";
import { isDecisionClosed } from "../decision-model";
import type { Renewal, RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { isDecisionCurrent, renewalTask } from "../workflow";

type StatusKey = "undecided" | "draft" | "reopened" | "decided" | "confirmed" | "handoff";

const STATUS_LABEL: Record<StatusKey, string> = {
  undecided: "Undecided",
  draft: "Draft",
  reopened: "Re-opened",
  decided: "Decided · outcome pending",
  handoff: "With finance lead",
  confirmed: "Confirmed",
};

const STATUS_TONE: Record<StatusKey, string> = {
  undecided: "bg-ui-tag-red-bg text-ui-tag-red-text",
  draft: "bg-ui-tag-orange-bg text-ui-tag-orange-text",
  reopened: "bg-ui-tag-orange-bg text-ui-tag-orange-text",
  decided: "bg-ui-tag-blue-bg text-ui-tag-blue-text",
  handoff: "bg-ui-tag-purple-bg text-ui-tag-purple-text",
  confirmed: "bg-ui-tag-green-bg text-ui-tag-green-text",
};

const VALUE_RANGES = [
  { id: "all", label: "Any value", test: () => true },
  { id: "small", label: "Under 25k", test: (v: number) => v < 25_000 },
  { id: "mid", label: "25k – 100k", test: (v: number) => v >= 25_000 && v <= 100_000 },
  { id: "large", label: "Over 100k", test: (v: number) => v > 100_000 },
] as const;

const GROUPS = [
  { id: "overdue", title: "Overdue to decide", caption: "Decide-by has passed", tone: "text-ui-fg-error" },
  { id: "month", title: "Decide this month", caption: "Next 30 days", tone: "text-ui-tag-orange-text" },
  { id: "upcoming", title: "Coming up", caption: "More than 30 days out", tone: "text-ui-fg-subtle" },
  { id: "done", title: "Decided", caption: "A decision is on record", tone: "text-ui-tag-green-text" },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

function statusOf(row: Renewal, resolution: Parameters<typeof renewalTask>[1]): StatusKey {
  const decision = resolution?.decision;
  if (!decision) return "undecided";
  if (decision.draft) return "draft";
  if (!isDecisionCurrent(row, resolution)) return "reopened";
  if (decision.action === "Escalate") return "handoff";
  return isDecisionClosed(decision) ? "confirmed" : "decided";
}

const groupOf = (status: StatusKey, row: Renewal): GroupId =>
  status === "decided" || status === "confirmed" || status === "handoff"
    ? "done"
    : row.daysToDecideBy < 0
      ? "overdue"
      : row.daysToDecideBy <= 30
        ? "month"
        : "upcoming";

function dueText(days: number) {
  if (days === 0) return "today";
  return days < 0 ? `${-days} day${days === -1 ? "" : "s"} overdue` : `in ${days} day${days === 1 ? "" : "s"}`;
}

const selectClass = "h-8 min-w-0 rounded-[8px] border border-ui-border-base bg-ui-bg-base px-2 text-[13px] text-ui-fg-base outline-none";

export type QueueFilterState = {
  decider: string;
  team: string;
  range: (typeof VALUE_RANGES)[number]["id"];
  status: "all" | StatusKey;
};

export const defaultQueueFilters: QueueFilterState = { decider: "all", team: "all", range: "all", status: "all" };

type FilterSection = { key: keyof QueueFilterState; label: string; options: { value: string; label: string }[] };

/** One "Filters" button; each category opens its own list of choices inside the same menu. */
export function QueueFilters({ renewals, value, onChange }: { renewals: RenewalSeed[]; value: QueueFilterState; onChange: (next: QueueFilterState) => void }) {
  const assessed = useAssessedRenewals(renewals);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<keyof QueueFilterState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const sections = useMemo<FilterSection[]>(() => {
    const names = (pick: (row: Renewal) => string | null) => [...new Set(assessed.map((entry) => pick(entry.row)).filter((name): name is string => Boolean(name)))].sort();
    return [
      { key: "decider", label: "Decider", options: [{ value: "all", label: "Any decider" }, ...names((row) => row.decider).map((name) => ({ value: name, label: name })), { value: "none", label: "No decider" }] },
      { key: "team", label: "Department", options: [{ value: "all", label: "Any department" }, ...names((row) => row.team).map((name) => ({ value: name, label: name })), { value: "none", label: "No department" }] },
      { key: "range", label: "Value", options: VALUE_RANGES.map((option) => ({ value: option.id, label: option.label })) },
      { key: "status", label: "Status", options: [{ value: "all", label: "Any status" }, ...(Object.keys(STATUS_LABEL) as StatusKey[]).map((key) => ({ value: key, label: STATUS_LABEL[key] }))] },
    ];
  }, [assessed]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (section) setSection(null); else setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open, section]);

  const activeCount = (Object.keys(defaultQueueFilters) as (keyof QueueFilterState)[]).filter((key) => value[key] !== defaultQueueFilters[key]).length;
  const labelFor = (entry: FilterSection) => entry.options.find((option) => option.value === value[entry.key])?.label ?? entry.options[0].label;
  const current = sections.find((entry) => entry.key === section);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen((was) => !was); setSection(null); }}
        className={clx(selectClass, "flex items-center gap-2 px-3 text-[14px] font-medium")}
      >
        <RiFilter3Line className="size-4 text-ui-fg-muted" aria-hidden="true" />
        Filters
        {activeCount > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-ui-bg-interactive px-1 text-[11px] font-bold leading-4 text-white">{activeCount}</span> : null}
      </button>

      {open ? (
        <div role="menu" aria-label="Queue filters" className="absolute left-0 top-full z-30 mt-1 w-[260px] overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout">
          {current ? (
            <>
              <button type="button" onClick={() => setSection(null)} className="flex w-full items-center gap-1.5 border-b border-ui-border-base px-3 py-2 text-left text-[13px] font-medium text-ui-fg-base hover:bg-ui-bg-subtle">
                <RiArrowLeftSLine className="size-4 text-ui-fg-muted" aria-hidden="true" />
                {current.label}
              </button>
              <div className="max-h-[280px] overflow-y-auto py-1">
                {current.options.map((option) => {
                  const selected = value[current.key] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => { onChange({ ...value, [current.key]: option.value } as QueueFilterState); setSection(null); }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[14px] text-ui-fg-base hover:bg-ui-bg-subtle"
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? <RiCheckLine className="size-4 shrink-0 text-ui-fg-interactive" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="py-1">
                {sections.map((entry) => (
                  <button key={entry.key} type="button" role="menuitem" onClick={() => setSection(entry.key)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-ui-bg-subtle">
                    <span className="text-[14px] text-ui-fg-base">{entry.label}</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className={clx("truncate text-[13px]", value[entry.key] === defaultQueueFilters[entry.key] ? "text-ui-fg-muted" : "font-medium text-ui-fg-interactive")}>{labelFor(entry)}</span>
                      <RiArrowRightSLine className="size-4 shrink-0 text-ui-fg-muted" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
              {activeCount > 0 ? (
                <button type="button" onClick={() => onChange(defaultQueueFilters)} className="w-full border-t border-ui-border-base px-3 py-2 text-left text-[13px] font-medium text-ui-fg-interactive hover:bg-ui-bg-subtle">
                  Clear all filters
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DecisionQueue({ renewals, filters }: { renewals: RenewalSeed[]; filters: QueueFilterState }) {
  const assessed = useAssessedRenewals(renewals);
  const { resolutions } = useRenewalRuntime();
  const { decider, team, range, status } = filters;

  const entries = useMemo(
    () =>
      assessed.map(({ slug, row }) => {
        const resolution = resolutions[slug];
        return { slug, row, resolution, status: statusOf(row, resolution) };
      }),
    [assessed, resolutions],
  );

  const visible = entries.filter((entry) => {
    if (decider !== "all" && (decider === "none" ? entry.row.decider !== null : entry.row.decider !== decider)) return false;
    if (team !== "all" && (team === "none" ? entry.row.team !== null : entry.row.team !== team)) return false;
    if (!VALUE_RANGES.find((option) => option.id === range)!.test(entry.row.contractValue)) return false;
    if (status !== "all" && entry.status !== status) return false;
    return true;
  });

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: visible.filter((entry) => groupOf(entry.status, entry.row) === group.id).sort((a, b) => a.row.daysToDecideBy - b.row.daysToDecideBy),
  }));

  return (
    <section aria-labelledby="decision-queue-heading" className="mt-5 flex flex-col gap-3">
      <h2 id="decision-queue-heading" className="text-[15px] font-semibold leading-5 text-ui-fg-base">Decision queue</h2>

      {visible.length === 0 ? (
        <Text as="p" className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 text-[13px] text-ui-fg-subtle">No contracts match these filters.</Text>
      ) : null}

      {grouped.map((group) => group.items.length === 0 ? null : (
        <div key={group.id} className="overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base">
          <div className="flex items-baseline justify-between gap-2 border-b border-ui-border-base bg-ui-bg-subtle px-3 py-2">
            <div className="flex items-baseline gap-2">
              <Text as="span" className={clx("text-[14px] font-semibold leading-5", group.tone)}>{group.title}</Text>
              <Text as="span" className="text-[12px] text-ui-fg-muted">{group.items.length} · {group.caption}</Text>
            </div>
          </div>
          <ul className="divide-y divide-ui-border-base">
            {group.items.map(({ slug, row, resolution, status: key }) => {
              const task = renewalTask(row, resolution);
              const decision = resolution?.decision && !resolution.decision.draft ? resolution.decision : undefined;
              return (
                <li key={slug} className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] items-center gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar src={row.logo} fallback={row.vendor.slice(0, 2).toUpperCase()} variant="squared" size="base" />
                    <div className="min-w-0">
                      <Link href={`/renewals/${row.id}`} className="block truncate text-[14px] font-semibold leading-5 text-ui-fg-base hover:underline">{row.vendor}</Link>
                      <Text as="p" className="truncate text-[12px] leading-4 text-ui-fg-subtle">
                        {row.seats ? `${row.seats.active} active · ${row.seats.purchased} paid` : `${row.subtitle} · ${row.usage} usage`}
                      </Text>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Text as="p" className="text-[11px] uppercase tracking-wide text-ui-fg-muted">Decide by</Text>
                    <Text as="p" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">
                      {row.decideBy}{row.decideByShifted ? " *" : ""}
                    </Text>
                    <Text as="p" className={clx("truncate text-[12px] leading-4", row.daysToDecideBy < 0 && key !== "confirmed" && key !== "decided" ? "text-ui-fg-error" : "text-ui-fg-subtle")}>{dueText(row.daysToDecideBy)}</Text>
                  </div>
                  <div className="min-w-0">
                    <Text as="p" className="text-[11px] uppercase tracking-wide text-ui-fg-muted">Decider</Text>
                    <Text as="p" className={clx("truncate text-[14px] leading-5", row.decider ? "text-ui-fg-base" : "font-medium text-ui-fg-error")}>
                      {row.decider ?? (row.deciderStatus === "departed" ? "Departed" : "No decider")}
                    </Text>
                    <Text as="p" className="truncate text-[12px] leading-4 text-ui-fg-subtle">{row.team ?? "No department"}</Text>
                  </div>
                  <div className="min-w-0">
                    <Text as="p" className="text-[11px] uppercase tracking-wide text-ui-fg-muted">Value</Text>
                    <Text as="p" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">{formatMoney(row.contractValue, row.currency)}</Text>
                    <Text as="p" className={clx("truncate text-[12px] leading-4", row.noticeAssumed ? "font-medium text-ui-tag-orange-text" : "text-ui-fg-subtle")}>
                      {row.noticeAssumed ? `Notice assumed ${row.noticeDays}d` : `${row.noticeDays}d notice`}
                    </Text>
                  </div>
                  <div className="min-w-0">
                    <span className={clx("inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[12px] font-medium", STATUS_TONE[key])}>
                      {STATUS_LABEL[key]}
                    </span>
                    <Text as="p" className="mt-1 truncate text-[12px] leading-4 text-ui-fg-subtle">
                      {decision ? actionLabel(decision.action) : row.termsChanges.length > 0 ? row.termsChanges[0] : task.title}
                    </Text>
                  </div>
                  <Button asChild variant={groupOfIsUrgent(key, row) ? "primary" : "secondary"} size="small">
                    <Link href={task.href}>{task.kind === "assign" ? "Assign" : task.kind === "done" ? "View" : "Decide"}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Text as="p" className="text-[12px] text-ui-fg-muted">* Decide-by moved earlier to land on a business day.</Text>
    </section>
  );
}

const groupOfIsUrgent = (key: StatusKey, row: Renewal) => (key === "undecided" || key === "reopened" || key === "draft") && row.daysToDecideBy <= 7;
