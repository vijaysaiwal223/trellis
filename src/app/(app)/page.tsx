"use client";

import { Input } from "@medusajs/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AskBrunoButton } from "@/components/layout/ask-bruno-button";
import { useRightPanel } from "@/components/layout/right-panel-state";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useSettings } from "@/lib/settings-state";
import {
  MetricsSummary,
  AssignOwnerDrawer,
  DecideAloneDrawer,
  DisputeDrawer,
  ManualDrawer,
  NegotiationDrawer,
  HandledDrawer,
  LockedInDrawer,
  NoticeDrawer,
  RecommendationDrawer,
  renewalStage,
  RenewalsTable,
  deriveMetrics,
  renewals,
  useAssessedRenewals,
  type MetricKey,
  type RenewalStage,
} from "@/features/renewal-risk";

type DrawerKind = "assign" | "review" | "locked" | "handled" | "notice" | "alone" | "manual" | "negotiation" | "dispute";

/** The renewals the table shows, in the order the review is walked through. */
const tableVendors = ["Gong", "Miro", "Zoom", "Jira", "HubSpot", "Figma", "Salesforce", "Asana", "Tableau"];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Status tabs follow the flow's stages. "All open" is the default working view.
const stageTabs: { key: string; label: string; matches: (stage: RenewalStage) => boolean }[] = [
  // Open renewals: everything not yet handled. Outcomes waiting for confirmation still need the lead.
  { key: "open", label: "All open", matches: (stage) => stage !== "handled" },
  { key: "no-owner", label: "No owner", matches: (stage) => stage === "no-owner" },
  { key: "awaiting", label: "Awaiting owner", matches: (stage) => stage === "awaiting-owner" || stage === "recommendation-in" },
  { key: "notice", label: "Ready for notice", matches: (stage) => stage === "ready-for-notice" },
  { key: "handled", label: "Handled", matches: (stage) => stage === "handled" },
];

const chipBase = "flex h-[32px] shrink-0 items-center justify-center gap-[6px] overflow-clip rounded-[6px] bg-white px-[10px] whitespace-nowrap text-[14px] font-medium leading-[20px] tracking-[-0.105px] text-[#18181b]";

export default function RenewalRiskPage() {
  const [filterKey, setFilterKey] = useState<MetricKey | null>(null);
  const [query, setQuery] = useState("");
  const [tabKey, setTabKey] = useState("open");
  // One drawer at a time: assigning an owner, or reviewing the owner's recommendation.
  const [drawer, setDrawer] = useState<{ kind: DrawerKind; slug: string } | null>(null);
  const { resolutions } = useRenewalRuntime();
  const { rules } = useSettings();
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
      : kind === "locked" ? <LockedInDrawer key={`locked-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "notice" ? <NoticeDrawer key={`notice-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "alone" ? <DecideAloneDrawer key={`alone-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "manual" ? (
        <ManualDrawer
          key={`manual-${slug}`}
          slug={slug}
          onClose={closeDrawer}
          onAssignFirst={() => setDrawer({ kind: "assign", slug })}
        />
      )
      : kind === "negotiation" ? <NegotiationDrawer key={`negotiation-${slug}`} slug={slug} onClose={closeDrawer} />
      : kind === "dispute" ? <DisputeDrawer key={`dispute-${slug}`} slug={slug} onClose={closeDrawer} />
      : <HandledDrawer key={`handled-${slug}`} slug={slug} onClose={closeDrawer} />;
    setPanel(element);
  }, [drawer, closeDrawer, setPanel]);
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
    const listed = renewals.filter(
      (row) => tableVendors.includes(row.vendor) && !(rules.skipMonthToMonth && row.contractType === "Month-to-month"),
    );
    return q ? listed.filter((row) => row.vendor.toLowerCase().includes(q)) : listed;
  }, [query, rules.skipMonthToMonth]);

  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="flex shrink-0 items-center justify-between px-[16px] py-[20px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[20px] font-semibold leading-[28px] tracking-[-0.05px] text-[#18181b]">
            Renewal decision
          </h1>
          <p className="text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">
            Sorted by decide-by: the last day you can cancel or change a contract (renewal date minus notice period).
          </p>
        </div>
        <AskBrunoButton />
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
          <div role="tablist" aria-label="Renewal status" className="flex items-center gap-[8px]">
            {stageTabs.map((tab) => {
              const selected = tab.key === activeTab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTabKey(tab.key)}
                  className={`${chipBase} ${
                    selected
                      ? "shadow-[0px_0px_0px_4px_rgba(37,99,235,0.2),0px_0px_0px_1px_#2563eb]"
                      : "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
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
            const decision = resolutions[id]?.decision;
            const escalated = stage === "awaiting-owner" && row.daysToDecideBy < -rules.escalateAfterDays;
            const kind: DrawerKind | null =
              stage === "locked-in" ? "locked"
              : stage === "recommendation-in" ? "review"
              : stage === "no-owner" && row.contractType === "Manual" ? "manual"
              : (stage === "no-owner" && row.daysToCancelBy <= 2) || escalated ? "alone"
              : stage === "awaiting-owner" || stage === "no-owner" ? "assign"
              : stage === "ready-for-notice" ? "notice"
              : stage === "awaiting-outcome" && decision?.action === "Renegotiate" ? "negotiation"
              : stage === "awaiting-outcome" && decision?.action === "Right-size" && decision.noticeSentAt ? "dispute"
              : stage === "handled" || stage === "awaiting-outcome" ? "handled"
              : null;
            if (kind) setDrawer((current) => (current?.slug === id && current.kind === kind ? null : { kind, slug: id }));
          }}
        />
      </div>
    </div>
  );
}
