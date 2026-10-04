"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState, type ReactNode } from "react";

import { now } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { addDays, addMonths, calendarDateIn, daysBetween, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "3 Oct" */
const dayMonth = (iso: ISODate) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/** "1 Jan 2027" */
const dayMonthYear = (iso: ISODate) => `${dayMonth(iso)} ${iso.slice(0, 4)}`;

/** "Sat 3 Oct" */
const weekdayDayMonth = (iso: ISODate) => {
  const weekday = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${dayMonth(iso)}`;
};

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-[4px]">
      <div className="flex h-full items-stretch self-stretch">
        <div className="h-full w-[4px] rounded-full bg-[#f43f5e]" />
      </div>
      <div className="flex min-w-px flex-1 flex-col gap-[12px] rounded-bl-[4px] rounded-br-[8px] rounded-tl-[4px] rounded-tr-[8px] border-[0.5px] border-solid border-[#fda4af] bg-[#ffe4e6] p-[12px] text-[14px] text-[#18181b]">
        {children}
      </div>
    </div>
  );
}

const cardClass = "flex flex-col gap-[12px] rounded-[12px] border border-solid border-[#e4e4e7] bg-white px-[10px] py-[14px]";
const neutralButton =
  "flex h-[32px] items-center justify-center rounded-[8px] bg-white px-[10px] text-[14px] font-medium tracking-[-0.105px] whitespace-nowrap text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5] disabled:opacity-50";

/**
 * Side drawer for a renewal whose notice deadline has passed. It states what happens
 * now, and offers the three things still possible. Each action uses the runtime, so
 * the row's status and the vendor page stay in step.
 */
export function LockedInDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, logVendorResponse, scheduleNextCycle, acceptAsIs } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const resolution = resolutions[slug];

  const [response, setResponse] = useState("");
  const [logged, setLogged] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row) return null;

  const today = calendarDateIn(now(), "UTC");
  // How far through the contract year we are: the bar fills as the renewal approaches.
  const yearStart = addMonths(row.renewalDate, -12);
  const elapsedPercent = Math.min(100, Math.max(0, (daysBetween(yearStart, today) / Math.max(1, daysBetween(yearStart, row.renewalDate))) * 100));

  const nextCancelBy = addMonths(row.cancelByISO, 12);
  const nextReviewOn = addDays(nextCancelBy, -30);
  const scheduled = resolution?.nextCycleReviewOn;
  const owner = row.owner ?? row.formerOwner ?? "No owner";
  const seats = row.seats;
  const perSeat = seats ? Math.round(row.contractValue / seats.purchased) : undefined;
  const unused = seats ? seats.purchased - seats.active : undefined;
  const unusedValue = seats && perSeat !== undefined && unused !== undefined ? unused * perSeat : undefined;
  const auto = row.contractType === "Auto-renew";
  const yoy = row.yoyPercent;

  const logResponse = () => {
    const text = response.trim();
    if (!text) return;
    logVendorResponse(row.id, text);
    setResponse("");
    setLogged(true);
    setAskOpen(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-center gap-[10px]">
          <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-white p-[2px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
            {row.logo ? (
              <img alt="" className="size-full rounded-[5px] object-cover" src={row.logo} />
            ) : (
              <span className="text-[12px] font-medium text-[#52525b]">{row.vendor.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-start gap-[4px]">
              <span className="whitespace-nowrap text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">{row.vendor}</span>
              <span className="flex items-center justify-center rounded-full border-[0.5px] border-solid border-[#fda4af] bg-[#ffe4e6] px-[6.5px] py-[2.5px] text-[12px] font-medium leading-[16px] tracking-[-0.06px] whitespace-nowrap text-[#9f1239]">
                Locked in
              </span>
            </div>
            <div className="flex gap-[4px] text-[14px] leading-[16px] tracking-[-0.07px] whitespace-nowrap text-[#52525b]">
              <span>{row.subtitle}</span>
              <span>•</span>
              <span>{`Owner: ${owner}`}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] border border-solid border-[#e4e4e7] bg-[#fafafa] text-[#52525b] hover:bg-[#f4f4f5]"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">
            The notice deadline has passed
          </span>
          <Callout>
            <span className="font-medium leading-[20px] tracking-[-0.105px]">
              {`${row.vendor}’s ${row.noticeDays}-day notice deadline was ${weekdayDayMonth(row.cancelByISO)}.`}
            </span>
            <span className="leading-[20px] tracking-[-0.035px]">
              {`It will ${auto ? "auto renew" : "renew"} on ${dayMonthYear(row.renewalDate)} for ${row.contractAmount}${
                yoy !== undefined && yoy > 0 ? `, ${yoy}% more than last year` : ""
              }. Under the contract it’s now too late to cancel or reduce seats for this term.`}
            </span>
          </Callout>
          <div className="flex h-[12px] w-full items-center overflow-clip rounded-[4px] bg-[#ffe9ea]">
            <div className="flex h-full rounded-[4px] bg-[#dae6fc]" style={{ width: `${elapsedPercent}%` }} />
          </div>
          <div className="flex w-full items-start justify-between text-center text-[12px] leading-[16px] whitespace-nowrap">
            <div className="flex flex-col items-center">
              <span className="tracking-[-0.03px] text-[#52525b]">Today</span>
              <span className="font-medium tracking-[-0.06px] text-[#18181b]">{dayMonth(today)}</span>
            </div>
            <div className="flex flex-col items-center text-[#1e40af]">
              <span className="tracking-[-0.03px]">Decide by</span>
              <span className="font-medium tracking-[-0.06px]">{dayMonth(row.decideByISO)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="tracking-[-0.03px] text-[#52525b]">Renews</span>
              <span className="font-medium tracking-[-0.06px] text-[#18181b]">{dayMonth(row.renewalDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">What this renewal includes</span>
          <div className="grid h-[138px] w-full shrink-0 grid-cols-2 grid-rows-2 overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white text-[14px] leading-[20px]">
            <div className="flex flex-col gap-[4px] border-b border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Annual value</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {perSeat !== undefined ? `${row.contractAmount} ($${perSeat.toLocaleString("en-US")} per seat)` : row.contractAmount}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-b border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Seats active</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {seats ? `${seats.active} of ${seats.purchased} (${Math.round((seats.active / seats.purchased) * 100)}%)` : row.usage}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Unused seats</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {unused !== undefined
                  ? `${unused}${unusedValue !== undefined ? ` • about $${unusedValue.toLocaleString("en-US")}/yr` : ""}`
                  : "Not tracked"}
              </span>
            </div>
            <div className="flex min-w-px flex-col gap-[4px] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">History</span>
              <span className="truncate font-medium tracking-[-0.14px] text-[#18181b]">
                {`Window closed ${dayMonth(row.cancelByISO)} • ${resolution?.decision ? "decision recorded" : "no recommendation recorded"}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">What you can still do</span>

          <div className={cardClass}>
            <div className="flex flex-col gap-[8px] text-[14px] leading-[20px]">
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{`Ask ${row.vendor} for a concession anyway`}</span>
              <span className="tracking-[-0.07px] text-[#52525b]">
                Some vendors accept late seat reduction or cap the increase. Not guaranteed.
              </span>
            </div>
            {askOpen ? (
              <div className="flex flex-col gap-[8px]">
                <textarea
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  aria-label="Vendor response"
                  rows={3}
                  placeholder="What did the vendor say?"
                  className="w-full resize-none rounded-[6px] bg-white px-[8px] py-[6px] text-[14px] leading-[20px] text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] outline-none"
                />
                <div className="flex justify-end gap-[8px]">
                  <button type="button" onClick={() => setAskOpen(false)} className={neutralButton}>
                    Cancel
                  </button>
                  <button type="button" onClick={logResponse} disabled={!response.trim()} className={neutralButton}>
                    Save response
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAskOpen(true)} className={`${neutralButton} w-fit`}>
                {logged ? "Log another response" : "Log vendor response"}
              </button>
            )}
          </div>

          <div className={cardClass}>
            <div className="flex flex-col gap-[8px] text-[14px] leading-[20px]">
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">Plan the next cycle now</span>
              <span className="tracking-[-0.07px] text-[#52525b]">
                {`Next decide-by: ${dayMonthYear(addDays(nextCancelBy, -14))}. It enters your queue 30 days earlier, on ${dayMonthYear(nextReviewOn)}, with ${owner === "No owner" ? "no owner yet" : firstName(owner) + " asked on day one"}.`}
              </span>
              {scheduled ? (
                <span className="text-[12px] text-[#52525b]">{`Scheduled for ${dayMonthYear(scheduled)}.`}</span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={Boolean(scheduled)}
              onClick={() => scheduleNextCycle(row.id, nextReviewOn)}
              className="flex h-[32px] w-fit items-center justify-center rounded-[8px] bg-[#2876f5] px-[10px] text-[14px] font-medium tracking-[-0.105px] whitespace-nowrap text-white shadow-[0px_0px_0px_1px_#0a5ce0] hover:bg-[#1f6be6] disabled:opacity-50"
            >
              {scheduled ? "Review scheduled" : "Schedule next review"}
            </button>
          </div>

          <div className={cardClass}>
            <div className="flex flex-col gap-[8px] text-[14px] leading-[20px]">
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{`Accept this renewal as is`}</span>
              <span className="tracking-[-0.07px] text-[#52525b]">
                {`Moves ${row.vendor} to handle with a notice that the deadline was missed`}
              </span>
            </div>
            <button type="button" onClick={() => { acceptAsIs(row.id); onClose(); }} className={`${neutralButton} w-fit`}>
              Accept and close
            </button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <p className="text-[14px] leading-[20px] tracking-[-0.035px] text-[#18181b]">
          We don’t mark this as handled until you pick one, so it stays visible at the top of the queue.
        </p>
      </div>
    </div>
  );
}

function firstName(name: string) {
  return name.split(" ")[0];
}
