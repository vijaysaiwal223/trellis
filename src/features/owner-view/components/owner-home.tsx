"use client";

import Link from "next/link";

import { OWNER_NAME } from "@/components/layout/profile-state";
import { dayMonth } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewalStage, renewals, type RenewalStage } from "@/features/renewal-risk";
import { actionLabel } from "@/features/renewal-detail/types";
import type { BadgeColor } from "@/features/renewal-risk/types";
import { Badge, Button, Heading, Table, Text } from "@medusajs/ui";

const statusFor: Partial<Record<RenewalStage, { label: string; color: BadgeColor }>> = {
  "awaiting-owner": { label: "Needs your call", color: "orange" },
  "recommendation-in": { label: "Recommendation sent", color: "blue" },
  "ready-for-notice": { label: "With Anika", color: "blue" },
  "awaiting-outcome": { label: "With Anika", color: "blue" },
  handled: { label: "Decided", color: "green" },
  "locked-in": { label: "Locked in", color: "red" },
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The owner's view: the tools they're accountable for, and the ones that need their call. */
export function OwnerHome() {
  const { resolutions, recordRecommendation } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const mine = assessed.filter((entry) => entry.row.owner === OWNER_NAME);
  // The owner is "assigned" by the lead in-app; email isn't sent, so this is the notice.
  const assignedToMe = assessed
    .flatMap((entry) =>
      (resolutions[entry.slug]?.history ?? [])
        .filter((event) => event.label === "Owner assigned" && event.ownerName === OWNER_NAME && entry.row.owner === OWNER_NAME)
        .map((event) => ({ vendor: entry.row.vendor, at: event.at.slice(0, 10) })),
    );
  const needsCall = mine.filter((entry) => renewalStage(entry.row, resolutions[entry.slug]) === "awaiting-owner");
  const annualSpend = mine.reduce((sum, entry) => sum + entry.row.contractValue, 0);
  const unusedSeats = mine.reduce((sum, entry) => sum + (entry.row.seats ? entry.row.seats.purchased - entry.row.seats.active : 0), 0);

  return (
    <div className="flex min-h-full w-full flex-col gap-[16px] p-[16px]">
      <div className="flex flex-col gap-[4px]">
        <Heading level="h1" className="text-[24px] font-semibold leading-[32px] text-ui-fg-base">My renewals</Heading>
        <Text className="text-[14px] leading-[20px] text-ui-fg-subtle">
          Tools you own. You&apos;re asked for a recommendation only when a contract enters its decision window.
        </Text>
      </div>

      {needsCall.length > 0 ? (
        <div className="flex flex-wrap items-center gap-[16px] rounded-[8px] border border-solid border-[#f1d3ae] bg-[#fdf0e1] px-[18px] py-[14px] text-[14px] text-[#5a2c00]">
          <span className="font-semibold">{`${needsCall.length} decision${needsCall.length === 1 ? "" : "s"} need${needsCall.length === 1 ? "s" : ""} you`}</span>
          <span>{needsCall.map((entry) => `${entry.row.vendor} · decide by ${dayMonth(entry.row.decideByISO)}`).join(" · ")}</span>
          <Link href={`/owner/${needsCall[0].slug}`} className="ml-auto h-[32px] rounded-[6px] bg-[#2876f5] px-[12px] leading-[32px] font-medium text-white">
            Make your call
          </Link>
        </div>
      ) : null}

      {assignedToMe.length > 0 ? (
        <div className="flex flex-col gap-[6px] rounded-[8px] border border-solid border-[#bcccee] bg-[#f3f6fd] p-[12px_16px] text-[14px] text-ui-fg-base">
          <span className="font-medium">New to you</span>
          {assignedToMe.map((item) => (
            <span key={`${item.vendor}-${item.at}`}>{`${item.vendor} was assigned to you on ${item.at}. Anika will ask for your call before the decide-by date.`}</span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-[12px]">
        {[
          { label: "Tools you own", value: String(mine.length) },
          { label: "Annual spend", value: usd.format(annualSpend) },
          { label: "Unused seats", value: unusedSeats.toLocaleString("en-US") },
        ].map((card) => (
          <div key={card.label} className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
            <span className="text-[12px] text-ui-fg-subtle">{card.label}</span>
            <span className="text-[22px] font-medium text-ui-fg-base">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto rounded-[8px] border border-solid border-ui-border-base bg-white">
        <Table className="text-[14px]">
          <Table.Header className="bg-ui-bg-subtle">
            <Table.Row className="text-left text-[12px] text-ui-fg-subtle">
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Tool</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Decide by</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] text-right font-normal">Annual value</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal">Status</Table.HeaderCell>
              <Table.HeaderCell className="px-[12px] py-[10px] font-normal" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {mine.length === 0 ? (
              <Table.Row>
                <Table.Cell className="px-[12px] py-[24px] text-ui-fg-muted">
                  You don&apos;t own any tools yet.
                </Table.Cell>
              </Table.Row>
            ) : null}
            {mine.map((entry) => {
              const stage = renewalStage(entry.row, resolutions[entry.slug]);
              // Past the decide-by date with no answer: the owner is overdue, not just asked.
              const overdue = stage === "awaiting-owner" && entry.row.daysToDecideBy < 0;
              const status = overdue ? { label: "Overdue", color: "red" as const } : statusFor[stage];
              const recommendation = resolutions[entry.slug]?.recommendation;
              return (
                <Table.Row key={entry.slug} className="border-t border-solid border-ui-border-base">
                  <Table.Cell className="px-[12px] py-[12px]">
                    <div className="flex flex-col">
                      <span className="font-medium text-ui-fg-base">{entry.row.vendor}</span>
                      <span className="text-[12px] text-ui-fg-subtle">{entry.row.subtitle}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-ui-fg-base">{dayMonth(entry.row.decideByISO)}</Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-right text-ui-fg-base">{entry.row.contractAmount}</Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px]">
                    {status ? (
                      <Badge color={status.color} size="xsmall">{status.label}</Badge>
                    ) : null}
                    {recommendation ? (
                      <div className="mt-[3px] text-[12px] text-ui-fg-subtle">{`You recommended ${recommendation.targetOutcome ?? actionLabel(recommendation.action)}`}</div>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell className="px-[12px] py-[12px] text-right">
                    {stage === "awaiting-owner" ? (
                      <div className="flex items-center justify-end gap-[8px]">
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
                        <Button asChild variant="primary" size="small">
                          <Link href={`/owner/${entry.slug}`}>Make your call</Link>
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
  );
}
