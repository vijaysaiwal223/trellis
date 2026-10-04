"use client";

import { useMemo, useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { weekdayDayMonth, dayMonth, dayMonthYear } from "@/lib/dates";
import { calendarDateIn, daysBetween } from "../deadlines";
import { now, stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import type { DecisionAction } from "@/features/renewal-detail/types";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { DeadlineBar, DrawerFrame, primaryButton, secondaryButton } from "./drawer-frame";

type Option = { key: string; label: string; detail: string; action: DecisionAction; targetOutcome?: string; danger?: boolean };

/**
 * Edge case: nobody owns the renewal and the notice deadline is two days away, or the
 * owner missed the escalation date. The lead decides alone, from the usage data.
 */
export function DecideAloneDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { assignOwner, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const [chosen, setChosen] = useState("reduce");
  const [alsoAssign, setAlsoAssign] = useState(false);

  const options = useMemo<Option[]>(() => {
    if (!row) return [];
    const active = row.seats?.active ?? 0;
    const purchased = row.seats?.purchased ?? 0;
    const target = Math.max(1, Math.round(active * 1.3));
    const perSeat = purchased ? row.contractValue / purchased : 0;
    return [
      {
        key: "reduce",
        label: `Reduce to ${target} seats`,
        detail: `Est. $${Math.round(target * perSeat).toLocaleString("en-US")}/yr · covers the ${active} active users with room to grow`,
        action: "Right-size",
        targetOutcome: `Reduce to ${target} seats`,
      },
      {
        key: "cancel",
        label: "Cancel",
        detail: `${active} people used ${row.vendor} in the last 30 days. They lose access after ${dayMonth(row.renewalDate)}, so tell them before you do this.`,
        action: "Cancel",
        danger: true,
      },
      { key: "renew", label: "Renew as is", detail: `${row.contractAmount} for ${purchased} seats`, action: "Renew" },
    ];
  }, [row]);

  if (!row) return null;

  const today = calendarDateIn(now(), "UTC");
  const span = Math.max(1, daysBetween(today, row.renewalDate));
  const fill = (daysBetween(today, row.decideByISO) / span) * 100;
  const selected = options.find((option) => option.key === chosen) ?? options[0];

  const record = () => {
    if (!selected) return;
    confirmDecision(row.id, {
      action: selected.action,
      targetOutcome: selected.targetOutcome,
      note: "Decided alone: nobody owned this renewal before the deadline.",
      ownerName: SIGNED_IN_NAME,
      recordedAt: stamp(),
    });
    if (alsoAssign) assignOwner(row.id, SIGNED_IN_NAME);
    onClose();
  };

  return (
    <DrawerFrame
      logo={row.logo}
      vendor={row.vendor}
      subtitle={`${row.subtitle} · no owner`}
      badge={<span className="rounded-full border-[0.5px] border-solid border-[#fda4af] bg-[#ffe4e6] px-[6.5px] py-[2.5px] text-[12px] font-medium text-[#9f1239]">No owner · {row.daysToCancelBy} days</span>}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="button" onClick={record} className={primaryButton}>Record decision</button>
        </>
      }
    >
      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Decide this one yourself</span>
        <div className="rounded-[6px] bg-[#ffe4e6] p-[10px] text-[13px] leading-[20px] text-[#5c1a1a]">
          {`${row.vendor}'s notice deadline is ${weekdayDayMonth(row.cancelByISO)}. That's too close to ask a new owner and wait for an answer, so the decision is yours.`}
        </div>
        <DeadlineBar today={dayMonth(today)} decideBy={dayMonth(row.decideByISO)} renews={dayMonth(row.renewalDate)} fillPercent={fill} tone="red" />
      </section>

      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Evidence</span>
        <dl className="grid grid-cols-2 gap-[12px_16px] text-[14px]">
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Seats active, 30 days</dt>
            <dd className="font-medium">{row.seats ? `${row.seats.active} of ${row.seats.purchased} (${Math.round((row.seats.active / row.seats.purchased) * 100)}%)` : row.usage}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Annual value</dt>
            <dd className="font-medium">{row.contractAmount}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Price change</dt>
            <dd className="font-medium">{row.yoyPercent === undefined ? "Not tracked" : `${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}% vs last year`}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Renews</dt>
            <dd className="font-medium">{`${dayMonthYear(row.renewalDate)} · ${row.contractType.toLowerCase()}`}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-[10px] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Your decision</span>
        <div role="radiogroup" aria-label="Your decision" className="flex flex-col gap-[8px]">
          {options.map((option) => {
            const on = option.key === (selected?.key ?? "");
            return (
              <label key={option.key} className={`flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid p-[12px_14px] ${on ? "border-[#2563eb] bg-[#f3f6fd]" : "border-[#e4e4e7]"}`}>
                <input type="radio" name="alone" checked={on} onChange={() => setChosen(option.key)} className="mt-[3px]" />
                <span className="flex min-w-px flex-1 flex-col">
                  <span className={`font-medium ${option.danger ? "text-[#9f1239]" : "text-[#18181b]"}`}>{option.label}</span>
                  <span className="text-[12px] text-[#52525b]">{option.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
        <label className="flex items-center gap-[8px] text-[13px]">
          <input type="checkbox" checked={alsoAssign} onChange={(event) => setAlsoAssign(event.target.checked)} />
          Also assign an owner so next year doesn&apos;t end up here again
        </label>
      </section>
    </DrawerFrame>
  );
}
