"use client";

import { useMemo, useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { dayMonthYear, dayMonth } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import type { DecisionAction } from "@/features/renewal-detail/types";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { DrawerFrame, primaryButton, secondaryButton } from "./drawer-frame";

/**
 * Edge case: a manual renewal. Nothing renews unless someone signs, so doing nothing
 * means access ends. The drawer makes that cost plain before any choice is recorded.
 */
export function ManualDrawer({
  slug,
  onClose,
  onAssignFirst,
}: {
  slug: string;
  onClose: () => void;
  onAssignFirst: () => void;
}) {
  const { confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const [chosen, setChosen] = useState("renew-more");

  const options = useMemo(() => {
    if (!row) return [];
    const active = row.seats?.active ?? 0;
    const purchased = row.seats?.purchased ?? 0;
    const more = Math.ceil(active * 1.1);
    const perSeat = purchased ? row.contractValue / purchased : 0;
    return [
      {
        key: "renew-more",
        label: `Renew with ${more} seats`,
        detail: `Covers today's ${active} users plus a little growth · est. $${Math.round(more * perSeat).toLocaleString("en-US")}/yr`,
        action: "Right-size" as DecisionAction,
        targetOutcome: `Renew with ${more} seats`,
      },
      { key: "renew", label: "Renew as is", detail: `${purchased} seats · ${row.contractAmount}/yr`, action: "Renew" as DecisionAction },
      { key: "lapse", label: "Let it lapse", detail: `Access ends ${dayMonth(row.renewalDate)}. Only if the team is moving to another tool.`, action: "Cancel" as DecisionAction },
    ];
  }, [row]);

  if (!row) return null;

  const active = row.seats?.active ?? 0;
  const purchased = row.seats?.purchased ?? 0;
  const over = active - purchased;
  const selected = options.find((option) => option.key === chosen) ?? options[0];

  const record = () => {
    if (!selected) return;
    confirmDecision(row.id, {
      action: selected.action,
      targetOutcome: selected.targetOutcome,
      note: "Manual renewal decided by the lead.",
      ownerName: row.owner ?? SIGNED_IN_NAME,
      recordedAt: stamp(),
    });
    onClose();
  };

  return (
    <DrawerFrame
      logo={row.logo}
      vendor={row.vendor}
      subtitle={`${row.subtitle} · manual renewal · ${row.owner ? `Owner: ${row.owner}` : "no owner"}`}
      badge={<span className="rounded-full border-[0.5px] border-solid border-[#93c5fd] bg-[#dbeafe] px-[6.5px] py-[2.5px] text-[12px] font-medium text-[#1e40af]">Manual</span>}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onAssignFirst} className={secondaryButton}>Assign an owner first</button>
          <button type="button" onClick={record} className={primaryButton}>Record decision</button>
        </>
      }
    >
      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Manual renewals fail the other way</span>
        <div className="rounded-[6px] bg-[#dbeafe] p-[10px] text-[13px] leading-[20px] text-[#16357a]">
          {`${row.vendor} won't renew unless someone signs a new order form. If nothing happens, access ends on ${dayMonthYear(row.renewalDate)} for the ${active} people using it. Seat or price changes still need notice by ${dayMonth(row.decideByISO)}.`}
        </div>
        <dl className="grid grid-cols-2 gap-[12px_16px] text-[14px]">
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Change seats or price by</dt>
            <dd className="font-medium">{dayMonthYear(row.decideByISO)}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Sign renewal by</dt>
            <dd className="font-medium">{dayMonthYear(row.renewalDate)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Evidence</span>
        <dl className="grid grid-cols-2 gap-[12px_16px] text-[14px]">
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Seats active, 30 days</dt>
            <dd className="font-medium">{over > 0 ? `${active} of ${purchased} (over by ${over})` : `${active} of ${purchased}`}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Annual value</dt>
            <dd className="font-medium">{purchased ? `${row.contractAmount} ($${Math.round(row.contractValue / purchased).toLocaleString("en-US")} per seat)` : row.contractAmount}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Price change</dt>
            <dd className="font-medium">{row.yoyPercent === undefined ? "Not tracked" : `${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}% vs last year`}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Owner</dt>
            <dd className="font-medium">{row.owner ?? "Unassigned"}</dd>
          </div>
        </dl>
        {over > 0 ? (
          <div className="rounded-[6px] bg-[#ffedd5] p-[10px] text-[13px] text-[#5a2c00]">
            Active users exceed seats bought, so the vendor may bill for the extra seats at renewal.
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-[10px] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Your decision</span>
        <div role="radiogroup" aria-label="Your decision" className="flex flex-col gap-[8px]">
          {options.map((option) => {
            const on = option.key === (selected?.key ?? "");
            return (
              <label key={option.key} className={`flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid p-[12px_14px] ${on ? "border-[#2563eb] bg-[#f3f6fd]" : "border-[#e4e4e7]"}`}>
                <input type="radio" name="manual" checked={on} onChange={() => setChosen(option.key)} className="mt-[3px]" />
                <span className="flex min-w-px flex-1 flex-col">
                  <span className="font-medium text-[#18181b]">{option.label}</span>
                  <span className="text-[12px] text-[#52525b]">{option.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </DrawerFrame>
  );
}
