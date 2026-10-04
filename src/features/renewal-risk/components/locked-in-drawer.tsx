"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import { now } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { addDays, addMonths, calendarDateIn, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { Badge, Button, IconButton, Text, Textarea } from "@medusajs/ui";
import { Alert } from "@/components/ui/alert";
import { Stepper, recoveryJourney } from "@/components/ui/stepper";
import { DeadlineTimeline } from "./deadline-timeline";

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


const cardClass = "flex flex-col gap-[12px] rounded-[12px] border border-solid border-[#e4e4e7] bg-white px-[10px] py-[14px]";
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
              <Badge color="red" size="xsmall" className="whitespace-nowrap">Locked in</Badge>
            </div>
            <div className="flex gap-[4px] text-[14px] leading-[16px] tracking-[-0.07px] whitespace-nowrap text-[#52525b]">
              <span>{row.subtitle}</span>
              <span>•</span>
              <span>{`Owner: ${owner}`}</span>
            </div>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <Stepper steps={recoveryJourney} current={1} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">
            The notice deadline has passed
          </span>
          <Alert status="Error">
            <span className="font-medium leading-[20px] tracking-[-0.105px]">
              {`${row.vendor}’s ${row.noticeDays}-day notice deadline was ${weekdayDayMonth(row.cancelByISO)}.`}
            </span>
            <span className="leading-[20px] tracking-[-0.035px]">
              {`It will ${auto ? "auto renew" : "renew"} on ${dayMonthYear(row.renewalDate)} for ${row.contractAmount}${
                yoy !== undefined && yoy > 0 ? `, ${yoy}% more than last year` : ""
              }. Under the contract it’s now too late to cancel or reduce seats for this term.`}
            </span>
          </Alert>
          <DeadlineTimeline row={row} today={today} />
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
                <Textarea
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  aria-label="Vendor response"
                  rows={3}
                  placeholder="What did the vendor say?"
                />
                <div className="flex justify-end gap-[8px]">
                  <Button variant="secondary" size="small" onClick={() => setAskOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="secondary" size="small" onClick={logResponse} disabled={!response.trim()}>
                    Save response
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="small" className="w-fit" onClick={() => setAskOpen(true)}>
                {logged ? "Log another response" : "Log vendor response"}
              </Button>
            )}
          </div>

          <div className={cardClass}>
            <div className="flex flex-col gap-[8px] text-[14px] leading-[20px]">
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">Plan the next cycle now</span>
              <span className="tracking-[-0.07px] text-[#52525b]">
                {`Next decide-by: ${dayMonthYear(nextCancelBy)}. It enters your queue 30 days earlier, on ${dayMonthYear(nextReviewOn)}, with ${owner === "No owner" ? "no owner yet" : firstName(owner) + " asked on day one"}.`}
              </span>
              {scheduled ? (
                <span className="text-[12px] text-[#52525b]">{`Scheduled for ${dayMonthYear(scheduled)}.`}</span>
              ) : null}
            </div>
            <Button variant="primary" size="small" className="w-fit" disabled={Boolean(scheduled)} onClick={() => scheduleNextCycle(row.id, nextReviewOn)}>
              {scheduled ? "Review scheduled" : "Schedule next review"}
            </Button>
          </div>

          <div className={cardClass}>
            <div className="flex flex-col gap-[8px] text-[14px] leading-[20px]">
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{`Accept this renewal as is`}</span>
              <span className="tracking-[-0.07px] text-[#52525b]">
                {`Moves ${row.vendor} to handle with a notice that the deadline was missed`}
              </span>
            </div>
            <Button variant="secondary" size="small" className="w-fit" onClick={() => { acceptAsIs(row.id); onClose(); }}>
              Accept and close
            </Button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Text className="text-[14px] leading-[20px] tracking-[-0.035px] text-[#18181b]">
          We don’t mark this as handled until you pick one, so it stays visible at the top of the queue.
        </Text>
      </div>
    </div>
  );
}

function firstName(name: string) {
  return name.split(" ")[0];
}
