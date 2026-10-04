"use client";

import Link from "next/link";

import { OWNER_NAME } from "@/components/layout/profile-state";
import { dayMonth } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useSettings } from "@/lib/settings-state";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewalStage, renewals, type RenewalStage } from "@/features/renewal-risk";
import { actionLabel } from "@/features/renewal-detail/types";

const statusFor: Partial<Record<RenewalStage, { label: string; tone: string }>> = {
  "awaiting-owner": { label: "Needs your call", tone: "bg-ui-tag-orange-bg text-ui-tag-orange-text" },
  "recommendation-in": { label: "Recommendation sent", tone: "bg-ui-tag-blue-bg text-ui-tag-blue-text" },
  "ready-for-notice": { label: "With Anika", tone: "bg-ui-tag-blue-bg text-ui-tag-blue-text" },
  "awaiting-outcome": { label: "With Anika", tone: "bg-ui-tag-blue-bg text-ui-tag-blue-text" },
  handled: { label: "Decided", tone: "bg-ui-tag-green-bg text-ui-tag-green-text" },
  "locked-in": { label: "Locked in", tone: "bg-ui-tag-red-bg text-ui-tag-red-text" },
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The owner's view: the tools they're accountable for, and the ones that need their call. */
export function OwnerHome() {
  const { resolutions, recordRecommendation } = useRenewalRuntime();
  const { rules } = useSettings();
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
        <h1 className="text-[24px] font-semibold leading-[32px] text-ui-fg-base">My renewals</h1>
        <p className="text-[14px] leading-[20px] text-ui-fg-subtle">
          Tools you own. You&apos;re asked for a recommendation only when a contract enters its decision window.
        </p>
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
        <table className="w-full text-[14px]">
          <thead className="bg-ui-bg-subtle">
            <tr className="text-left text-[12px] text-ui-fg-subtle">
              <th className="px-[12px] py-[10px] font-normal">Tool</th>
              <th className="px-[12px] py-[10px] font-normal">Decide by</th>
              <th className="px-[12px] py-[10px] text-right font-normal">Annual value</th>
              <th className="px-[12px] py-[10px] font-normal">Status</th>
              <th className="px-[12px] py-[10px] font-normal" />
            </tr>
          </thead>
          <tbody>
            {mine.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-[12px] py-[24px] text-center text-ui-fg-muted">
                  You don&apos;t own any tools yet.
                </td>
              </tr>
            ) : null}
            {mine.map((entry) => {
              const stage = renewalStage(entry.row, resolutions[entry.slug]);
              // Past the decide-by date with no answer: the owner is overdue, not just asked.
              // The reminder rule decides when an unanswered request is flagged as overdue.
              const flagged =
                stage === "awaiting-owner" &&
                rules.reminder !== "never" &&
                (rules.reminder === "on_due" ? entry.row.daysToDecideBy <= 0 : entry.row.daysToDecideBy < 0);
              const escalated = stage === "awaiting-owner" && entry.row.daysToDecideBy < -rules.escalateAfterDays;
              const overdue = flagged;
              const status = escalated
                ? { label: "Escalated to Anika", tone: "bg-ui-tag-red-bg text-ui-tag-red-text" }
                : overdue
                  ? { label: "Overdue", tone: "bg-ui-tag-red-bg text-ui-tag-red-text" }
                  : statusFor[stage];
              const recommendation = resolutions[entry.slug]?.recommendation;
              return (
                <tr key={entry.slug} className="border-t border-solid border-ui-border-base">
                  <td className="px-[12px] py-[12px]">
                    <div className="flex flex-col">
                      <span className="font-medium text-ui-fg-base">{entry.row.vendor}</span>
                      <span className="text-[12px] text-ui-fg-subtle">{entry.row.subtitle}</span>
                    </div>
                  </td>
                  <td className="px-[12px] py-[12px] text-ui-fg-base">{dayMonth(entry.row.decideByISO)}</td>
                  <td className="px-[12px] py-[12px] text-right text-ui-fg-base">{entry.row.contractAmount}</td>
                  <td className="px-[12px] py-[12px]">
                    {status ? (
                      <span className={`inline-flex rounded-full px-[8px] py-[2px] text-[12px] font-medium ${status.tone}`}>{status.label}</span>
                    ) : null}
                    {recommendation ? (
                      <div className="mt-[3px] text-[12px] text-ui-fg-subtle">{`You recommended ${recommendation.targetOutcome ?? actionLabel(recommendation.action)}`}</div>
                    ) : null}
                  </td>
                  <td className="px-[12px] py-[12px] text-right">
                    {stage === "awaiting-owner" ? (
                      <div className="flex items-center justify-end gap-[8px]">
                        {overdue ? (
                          <button
                            type="button"
                            onClick={() =>
                              recordRecommendation(entry.slug, {
                                action: "Renew",
                                note: "Renew as is (one click, after the due date).",
                                submittedAt: stamp(),
                              })
                            }
                            className="h-[32px] rounded-[6px] bg-white px-[10px] text-[14px] font-medium text-ui-fg-base shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]"
                          >
                            Renew as is
                          </button>
                        ) : null}
                        <Link href={`/owner/${entry.slug}`} className="inline-flex h-[32px] items-center rounded-[6px] bg-[#2876f5] px-[10px] text-[14px] font-medium text-white">
                          Make your call
                        </Link>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
