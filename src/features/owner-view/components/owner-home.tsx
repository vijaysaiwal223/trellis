"use client";


import { useCallback, useEffect, useState } from "react";

import { AskBrunoButton } from "@/components/layout/ask-bruno-button";
import { useAiAssistant } from "@/components/layout/ai-assistant-state";
import { OWNER_NAME } from "@/components/layout/profile-state";
import { useRightPanel } from "@/components/layout/right-panel-state";
import { SeatGauge } from "@/components/ui/seat-gauge";
import { stamp } from "@/lib/clock";
import { dayMonth, dayMonthYear } from "@/lib/dates";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewalStage, renewals, type RenewalStage } from "@/features/renewal-risk";
import type { BadgeColor } from "@/features/renewal-risk/types";
import { Badge, Button, Table } from "@medusajs/ui";
import { OwnerDecisionDrawer } from "./owner-decision-drawer";

const statusFor: Partial<Record<RenewalStage, { label: string; color: BadgeColor }>> = {
  "awaiting-owner": { label: "Need your call", color: "orange" },
  "recommendation-in": { label: "Recommendation sent", color: "blue" },
  "ready-for-notice": { label: "With Anika", color: "blue" },
  "awaiting-outcome": { label: "With Anika", color: "blue" },
  handled: { label: "Decided", color: "green" },
  "locked-in": { label: "Locked in", color: "red" },
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "in 28 days", "2 days ago", "today". */
const relativeDays = (days: number) => (days < 0 ? `${-days} days ago` : days === 0 ? "today" : `in ${days} days`);

/** A vendor's logo in a small card, or its initials when there's no logo. */
function VendorLogo({ logo, vendor }: { logo: string; vendor: string }) {
  return (
    <span className="flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white p-px shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
      {logo ? (
        <img alt="" src={logo} className="size-full rounded-[5px] object-cover" />
      ) : (
        <span className="text-[12px] font-medium text-[#52525b]">{vendor.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

/** A figure with its icon, as the dashboard's summary row shows them. */
function KpiCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-1 items-start gap-[12px] rounded-[12px] border border-solid border-ui-border-base bg-ui-bg-subtle p-[10px]">
      <span className="relative size-[20px] shrink-0">
        <img alt="" src={icon} className="absolute block inset-0 max-w-none size-full" />
      </span>
      <div className="flex flex-col gap-[6px]">
        <span className="text-[14px] leading-[20px] text-ui-fg-subtle">{label}</span>
        <span className="text-[20px] font-medium leading-[28px] text-ui-fg-base">{value}</span>
      </div>
    </div>
  );
}

/** The owner's view: the tools they're accountable for, and the ones that need their call. */
export function OwnerHome() {
  const { resolutions, recordRecommendation } = useRenewalRuntime();
  const { setPanel } = useRightPanel();
  const { close: closeBruno } = useAiAssistant();
  // The decision drawer opens beside the table for the tool picked with "Make your call".
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setOpenSlug(null), []);
  useEffect(() => {
    setPanel(openSlug ? <OwnerDecisionDrawer key={openSlug} slug={openSlug} onClose={closeDrawer} /> : null, 400);
  }, [openSlug, closeDrawer, setPanel]);
  useEffect(() => () => setPanel(null), [setPanel]);
  const assessed = useAssessedRenewals(renewals);
  const mine = assessed.filter((entry) => entry.row.owner === OWNER_NAME);
  const annualSpend = mine.reduce((sum, entry) => sum + entry.row.contractValue, 0);
  const unusedSeats = mine.reduce((sum, entry) => sum + (entry.row.seats ? entry.row.seats.purchased - entry.row.seats.active : 0), 0);

  return (
    <div className="flex min-h-full w-full gap-[4px] p-[4px]">
    <div className="flex min-w-0 flex-1 flex-col gap-[16px] p-[12px]">
      <div className="flex items-start justify-between gap-[16px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="text-[20px] font-semibold leading-[28px] tracking-[-0.05px] text-ui-fg-base">My renewal</h1>
          <p className="text-[14px] leading-[20px] tracking-[-0.07px] text-ui-fg-subtle">
            Sorted by decide-by: the last day you can cancel or change a contract (renewal date minus notice period).
          </p>
        </div>
        <AskBrunoButton />
      </div>

      <div className="flex gap-[8px]">
        <KpiCard icon="/assets/figma/dashboard/kpi-subscription.svg" label="Subscription you own" value={String(mine.length)} />
        <KpiCard icon="/assets/figma/dashboard/kpi-spend.svg" label="Annual spend" value={usd.format(annualSpend)} />
        <KpiCard icon="/assets/figma/dashboard/kpi-seats.svg" label="Unused seats" value={unusedSeats.toLocaleString("en-US")} />
      </div>

      <div className="w-full overflow-x-auto rounded-[12px] border border-solid border-ui-border-base bg-white">
        <Table className="text-[14px]">
          <Table.Header className="bg-ui-bg-subtle">
            <Table.Row className="text-left text-[14px] text-ui-fg-subtle">
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Vendor</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Decided by</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Renew</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Seats active</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] text-right font-normal">Annual value</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] text-right font-normal">YoY</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Status</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {mine.length === 0 ? (
              <Table.Row>
                <Table.Cell className="px-[12px] py-[24px] text-ui-fg-muted">You don&apos;t own any tools yet.</Table.Cell>
              </Table.Row>
            ) : null}
            {mine.map((entry) => {
              const row = entry.row;
              const stage = renewalStage(row, resolutions[entry.slug]);
              // Past the decide-by date with no answer: the owner is overdue, not just asked.
              const overdue = stage === "awaiting-owner" && row.daysToDecideBy < 0;
              const status = overdue ? { label: "Overdue", color: "red" as const } : statusFor[stage];
              const usagePercent = row.seats ? Math.round((row.seats.active / row.seats.purchased) * 100) : 0;
              return (
                <Table.Row key={entry.slug} className="border-t border-solid border-ui-border-base">
                  <Table.Cell className="px-[12px] py-[12px]">
                    <div className="flex items-center gap-[12px]">
                      <VendorLogo logo={row.logo} vendor={row.vendor} />
                      <div className="flex flex-col">
                        <span className="font-medium text-ui-fg-base">{row.vendor}</span>
                        <span className="text-[14px] leading-[20px] text-ui-fg-subtle">{row.subtitle}</span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-ui-fg-base">
                    <div className="flex flex-col">
                      <span>{dayMonth(row.decideByISO)}</span>
                      <span className={`text-[14px] leading-[20px] ${row.daysToDecideBy <= 7 ? "text-[#9a3412]" : "text-ui-fg-subtle"}`}>
                        {relativeDays(row.daysToDecideBy)}
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-ui-fg-base">
                    <div className="flex flex-col">
                      <span>{dayMonthYear(row.renewalDate)}</span>
                      <span className="text-[14px] leading-[20px] text-ui-fg-muted">{`${row.contractType} • ${row.noticeDays}-day notice`}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-ui-fg-base">
                    {row.seats ? (
                      <div className="flex items-center gap-[12px]">
                        <SeatGauge percent={usagePercent} />
                        <span>{`${row.seats.active}/${row.seats.purchased}`}</span>
                      </div>
                    ) : (
                      <span className="text-ui-fg-subtle">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-right text-ui-fg-base">{row.contractAmount}</Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-right">
                    {row.yoyPercent !== undefined ? (
                      <span className={row.yoyPercent > 0 ? "text-[#9a3412]" : "text-ui-fg-subtle"}>
                        {`${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}%`}
                      </span>
                    ) : (
                      <span className="text-ui-fg-subtle">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px]">
                    {status ? <Badge color={status.color} size="xsmall">{status.label}</Badge> : null}
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px]">
                    {stage === "awaiting-owner" ? (
                      <div className="flex items-center gap-[8px]">
                        {overdue ? (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() =>
                              recordRecommendation(entry.slug, {
                                action: "Renew",
                                note: "Renew as is (one click, after the due date).",
                                submittedAt: stamp(),
                              })
                            }
                          >
                            Renew as is
                          </Button>
                        ) : null}
                        <Button variant="primary" size="small" onClick={() => { closeBruno(); setOpenSlug(entry.slug); }}>
                          Make your call
                        </Button>
                      </div>
                    ) : null}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </div>
    </div>
  );
}
