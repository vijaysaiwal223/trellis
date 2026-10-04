"use client";

import { useMemo, useState } from "react";

import { dayMonth, weekdayDayMonth } from "@/lib/dates";
import { calendarDateIn, daysBetween } from "../deadlines";
import { now, stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { DeadlineBar, DrawerFrame, primaryButton, secondaryButton } from "./drawer-frame";

const logged = new Set(["Vendor response logged", "Decision recorded", "Decision corrected", "Recommendation sent", "Question asked"]);

/**
 * Edge case: a renegotiation is still open close to the deadline. The lead sees the log,
 * then decides whether to protect the cancel option with a notice or accept the offer.
 */
export function NegotiationDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, logVendorResponse, recordNotice, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const resolution = resolutions[slug];
  const decision = resolution?.decision;
  const [chosen, setChosen] = useState("notice");
  const [update, setUpdate] = useState("");

  const log = useMemo(
    () => (resolution?.history ?? []).filter((event) => logged.has(event.label)),
    [resolution],
  );

  if (!row || !decision) return null;

  const today = calendarDateIn(now(), "UTC");
  const span = Math.max(1, daysBetween(today, row.renewalDate));
  const fill = (daysBetween(today, row.decideByISO) / span) * 100;
  const apply = () => {
    if (chosen === "notice") recordNotice(row.id, { sentAt: stamp(), method: "Email to account executive" });
    if (chosen === "accept") confirmDecision(row.id, { ...decision, confirmedAt: stamp(), note: "Accepted the vendor's offer." });
    onClose();
  };

  return (
    <DrawerFrame
      logo={row.logo}
      vendor={row.vendor}
      subtitle={`${row.subtitle} · Owner: ${row.owner ?? "none"}`}
      badge={<span className="rounded-full border-[0.5px] border-solid border-[#fdba74] bg-[#ffedd5] px-[6.5px] py-[2.5px] text-[12px] font-medium text-[#9a3412]">Negotiating</span>}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Close</button>
          <button type="button" onClick={apply} className={primaryButton}>Apply choice</button>
        </>
      }
    >
      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">The deadline will pass before the deal closes</span>
        <div className="rounded-[6px] bg-[#ffe4e6] p-[10px] text-[13px] leading-[20px] text-[#5c1a1a]">
          {`Notice is due ${weekdayDayMonth(row.cancelByISO)}. If nothing is sent, ${row.vendor} auto-renews on ${dayMonth(row.renewalDate)} at its standard price and your leverage is gone.`}
        </div>
        <DeadlineBar today={dayMonth(today)} decideBy={dayMonth(row.decideByISO)} renews={dayMonth(row.renewalDate)} fillPercent={fill} tone="red" />
      </section>

      <section className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Negotiation log</span>
        <ol className="flex flex-col">
          {log.length === 0 ? <li className="py-[8px] text-[13px] text-[#52525b]">Nothing logged yet.</li> : null}
          {log.map((event) => (
            <li key={`${event.at}-${event.label}`} className="flex gap-[12px] border-t border-solid border-[#ececE8] py-[8px] text-[13px]">
              <span className="w-[56px] shrink-0 text-[#52525b]">{dayMonth(event.at.slice(0, 10))}</span>
              <span className="text-[#18181b]">{event.note ? event.note : event.label}</span>
            </li>
          ))}
        </ol>
        <div className="flex gap-[8px]">
          <input
            value={update}
            onChange={(event) => setUpdate(event.target.value)}
            aria-label="Add update"
            placeholder="What did the vendor say?"
            className="h-[36px] flex-1 rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[13px]"
          />
          <button
            type="button"
            disabled={!update.trim()}
            onClick={() => {
              logVendorResponse(row.id, update.trim());
              setUpdate("");
            }}
            className={secondaryButton}
          >
            Add update
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-[10px] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">What to do before the deadline</span>
        <div role="radiogroup" aria-label="What to do" className="flex flex-col gap-[8px]">
          {[
            { key: "notice", label: "Send notice of non-renewal now", detail: "Stops the auto-renewal. You can still sign a new order form before the renewal date if the vendor agrees. Check your contract allows this." },
            { key: "accept", label: "Accept the vendor's latest offer", detail: "Closes the negotiation on the vendor's last terms." },
            { key: "wait", label: "Let it auto-renew and keep talking", detail: "Only if you're comfortable paying the standard price." },
          ].map((option) => {
            const on = chosen === option.key;
            return (
              <label key={option.key} className={`flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid p-[12px_14px] ${on ? "border-[#2563eb] bg-[#f3f6fd]" : "border-[#e4e4e7]"}`}>
                <input type="radio" name="negotiation" checked={on} onChange={() => setChosen(option.key)} className="mt-[3px]" />
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
