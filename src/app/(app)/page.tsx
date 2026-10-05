"use client";

import { Alert } from "@/components/ui/alert";
import { Button, Heading, Input, Tabs, Text } from "@medusajs/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AskBrunoButton } from "@/components/layout/ask-bruno-button";
import { useRightPanel } from "@/components/layout/right-panel-state";
import { SIGNED_IN_NAME } from "@/config/people";
import { calendarDateIn } from "@/features/renewal-risk/deadlines";
import { now } from "@/lib/clock";
import { dayMonth } from "@/lib/dates";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import {
  MetricsSummary,
  AssignOwnerDrawer,
  HandledDrawer,
  LockedInDrawer,
  NoticeDrawer,
  RecommendationDrawer,
  SelfDecisionDrawer,
  renewalStage,
  RenewalsTable,
  deriveMetrics,
  renewals,
  stageLabel,
  useAssessedRenewals,
  type MetricKey,
  type RenewalStage,
} from "@/features/renewal-risk";

type DrawerKind = "assign" | "review" | "self" | "locked" | "handled" | "notice";

const todayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  .format(now())
  .replace(/^(\w+) /, "$1, ");

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Status tabs follow the flow's stages. "All open" is the default working view.
const stageTabs: { key: string; label: string; matches: (stage: RenewalStage) => boolean }[] = [
  // The working view: every renewal in the queue, handled ones included, so the lead sees what closed.
  { key: "open", label: "All open", matches: () => true },
  { key: "no-owner", label: "No owner", matches: (stage) => stage === "no-owner" },
  { key: "awaiting", label: "Awaiting owner", matches: (stage) => stage === "awaiting-owner" || stage === "recommendation-in" },
  { key: "notice", label: "Ready for notice", matches: (stage) => stage === "ready-for-notice" },
  { key: "handled", label: "Handled", matches: (stage) => stage === "handled" },
];

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const [query, setQuery] = useState("");
  const [tabKey, setTabKey] = useState("open");
  // One drawer at a time: assigning an owner, or reviewing the owner's recommendation.
  const [drawer, setDrawer] = useState<{ kind: DrawerKind; slug: string } | null>(null);
  // After written notice goes out, the lead gets a confirmation until they dismiss it.
  const [notice, setNotice] = useState<{ slug: string; vendor: string; date: string } | null>(null);
  const { resolutions } = useRenewalRuntime();
  const { setPanel } = useRightPanel();
  const closeDrawer = useCallback(() => setDrawer(null), []);

  // The drawer lives beside the main card, so it is handed to the shell's right panel.
  useEffect(() => {
    if (!drawer) {
      setPanel(null);
      return;
    }
    const { kind, slug } = drawer;
    const element =
      kind === "assign" ? <AssignOwnerDrawer key={`assign-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "review" ? <RecommendationDrawer key={`review-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "self" ? <SelfDecisionDrawer key={`self-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "locked" ? <LockedInDrawer key={`locked-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "notice" ? (
        <NoticeDrawer
          key={`notice-${slug}`}
          slug={slug}
          onClose={closeDrawer}
          onSent={(vendor) => setNotice({ slug, vendor, date: dayMonth(calendarDateIn(now(), "UTC")) })}
        />
      )
      : <HandledDrawer key={`handled-${slug}`} slug={slug} onClose={closeDrawer} />;
    setPanel(element);
  }, [drawer, closeDrawer, setPanel, setNotice]);
  useEffect(() => () => setPanel(null), [setPanel]);
  const assessed = useAssessedRenewals(renewals);
  const metrics = useMemo(() => deriveMetrics(assessed), [assessed]);
  const activeTab = stageTabs.find((tab) => tab.key === tabKey) ?? stageTabs[0];

  // Metric totals stay computed from the full portfolio — only the table
  // rows below narrow when searching by vendor name.
  // Open renewals, soonest first: what the all-clear panel says is coming up.
  const upcoming = useMemo(
    () =>
      assessed
        .filter((entry) => renewalStage(entry.row, resolutions[entry.slug]) !== "handled")
        .sort((a, b) => a.row.decideByISO.localeCompare(b.row.decideByISO))
        .map((entry) => ({
          vendor: entry.row.vendor,
          decideByISO: entry.row.decideByISO,
          value: usd.format(entry.row.contractValue),
          owner: entry.row.owner,
        })),
    [assessed, resolutions],
  );

  const searchedRenewals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? renewals.filter((row) => row.vendor.toLowerCase().includes(q)) : renewals;
  }, [query]);

  // The queue as a CSV: what the table shows, one row per renewal.
  const exportQueue = () => {
    const header = ["Vendor", "Decide by", "Renews", "Annual value", "Owner", "Status"];
    const lines = assessed.map(({ row, slug }) => [
      row.vendor,
      row.cancelByISO,
      row.renewalDate,
      String(row.contractValue),
      row.owner ?? (row.formerOwner ? `${row.formerOwner} (left company)` : ""),
      stageLabel[renewalStage(row, resolutions[slug])],
    ]);
    const csv = [header, ...lines].map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "renewal-decisions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      {notice ? (
        <Alert
          status="Success"
          title={`${notice.vendor} notice sent ${notice.date}.`}
          className="mx-[16px] mt-[16px]"
          actionsPosition="end"
          actions={
            <>
              <Button variant="transparent" size="small" onClick={() => { setDrawer({ kind: "handled", slug: notice.slug }); setNotice(null); }}>
                View record
              </Button>
              <Button variant="transparent" size="small" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            </>
          }
        >
          {`Sent by ${SIGNED_IN_NAME}. It stays open until the vendor's outcome is confirmed.`}
        </Alert>
      ) : null}
      <header className="flex shrink-0 items-center justify-between px-[16px] py-[20px]">
        <div className="flex flex-col gap-[8px]">
          <Heading level="h1" className="font-heading text-[20px] font-semibold leading-[28px] tracking-[-0.05px] text-[#18181b]">
            Renewal decisions
          </Heading>
          <Text className="text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">
            Sorted by decide-by: the last day you can cancel or change a contract (renewal date minus notice period).
          </Text>
        </div>
        <div className="flex items-center gap-[12px]">
          <span className="whitespace-nowrap text-[14px] text-[#52525b]">{todayLabel}</span>
          <Button variant="secondary" size="small" onClick={exportQueue}>
            Export
          </Button>
          <AskBrunoButton />
        </div>
      </header>
      <div className="shrink-0">
        <MetricsSummary
          metrics={metrics}
          activeFilter={filterKey}
          onSelectFilter={(key) => setFilterKey((current) => (current === key ? null : key))}
        />
      </div>
      <div className="flex flex-col gap-[24px] p-[16px]">
        <div className="flex w-full shrink-0 items-center justify-between">
          <Tabs value={activeTab.key} onValueChange={setTabKey}>
            <Tabs.List>
              {stageTabs.map((tab) => (
                <Tabs.Trigger key={tab.key} value={tab.key}>
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendor"
            aria-label="Search vendor"
            className="!h-[32px] !w-[169px] !text-[14px]"
          />
        </div>
        <RenewalsTable
          renewals={searchedRenewals}
          filterKey={filterKey}
          onClearFilter={() => setFilterKey(null)}
          stageMatch={activeTab.matches}
          selectedId={drawer?.slug ?? null}
          onAssign={(id) => setDrawer((current) => (current?.slug === id && current.kind === "assign" ? null : { kind: "assign", slug: id }))}
          upcoming={upcoming}
          onOpen={(id) => {
            // Each status opens the drawer built for it.
            const row = assessed.find((entry) => entry.slug === id)?.row;
            if (!row) return;
            const stage = renewalStage(row, resolutions[id]);
            const kind: DrawerKind | null =
              stage === "locked-in" ? "locked"
              : stage === "recommendation-in" ? "review"
              : stage === "awaiting-owner" && row.owner === SIGNED_IN_NAME ? "self"
              : stage === "awaiting-owner" || stage === "no-owner" ? "assign"
              : stage === "ready-for-notice" ? "notice"
              : stage === "handled" || stage === "awaiting-outcome" ? "handled"
              : null;
            if (kind) setDrawer((current) => (current?.slug === id && current.kind === kind ? null : { kind, slug: id }));
          }}
        />
      </div>
    </div>
  );
}
