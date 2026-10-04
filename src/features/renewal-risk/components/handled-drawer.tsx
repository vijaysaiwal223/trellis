"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState, type ReactNode } from "react";

import { actionLabel } from "@/features/renewal-detail/types";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { stamp } from "@/lib/clock";

import type { ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import type { Renewal } from "../types";
import { Badge, Button, IconButton, Input, Textarea } from "@medusajs/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "28 Sep" */
const dayMonth = (iso: ISODate) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/** "1 Jan 2027" */
const dayMonthYear = (iso: ISODate) => `${dayMonth(iso)} ${iso.slice(0, 4)}`;

const DECISION_WORDING: Record<string, string> = {
  Renew: "Renew as is",
  Renegotiate: "Renegotiate price",
  "Right-size": "Downsize seats",
  Cancel: "Cancel",
};

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-[4px]">
      <div className="flex h-full items-stretch self-stretch">
        <div className="h-full w-[4px] rounded-full bg-[#10b981]" />
      </div>
      <div className="flex min-w-px flex-1 flex-col gap-[8px] rounded-bl-[4px] rounded-br-[8px] rounded-tl-[4px] rounded-tr-[8px] border-[0.5px] border-solid border-[#6ee7b7] bg-[#d1fae5] p-[12px] text-[14px] text-[#18181b]">
        {children}
      </div>
    </div>
  );
}

/**
 * Read-only view of a renewal that's been handled: the decision that was recorded,
 * when it was recorded and confirmed, and the facts it was based on.
 */
export function HandledDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, logVendorResponse, recordNotice, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row: Renewal | undefined = assessed.find((entry) => entry.slug === slug)?.row;
  const decision = resolutions[slug]?.decision;
  const [vendorNote, setVendorNote] = useState("");
  const [disputeSeats, setDisputeSeats] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row || !decision) return null;

  const wording = DECISION_WORDING[decision.action] ?? actionLabel(decision.action);
  const recorded = decision.recordedAt?.slice(0, 10);
  const confirmed = decision.confirmedAt?.slice(0, 10);
  const seats = row.seats;
  const perSeat = seats ? Math.round(row.contractValue / seats.purchased) : undefined;
  const yoy = row.yoyPercent;

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
              {decision.confirmedAt ? (
                <Badge color="green" size="xsmall" className="whitespace-nowrap">Handled</Badge>
              ) : (
                <Badge color="blue" size="xsmall" className="whitespace-nowrap">Awaiting outcome</Badge>
              )}
            </div>
            <div className="flex gap-[4px] text-[14px] leading-[16px] tracking-[-0.07px] whitespace-nowrap text-[#52525b]">
              <span>{row.subtitle}</span>
              <span>•</span>
              <span>{`Owner: ${decision.ownerName ?? row.owner ?? "—"}`}</span>
            </div>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Decision recorded</span>
          <Callout>
            <span className="font-medium leading-[20px] tracking-[-0.07px]">
              {decision.targetOutcome ? `${wording}: ${decision.targetOutcome}` : wording}
            </span>
            {decision.note ? <span className="leading-[20px] tracking-[-0.035px]">{`“${decision.note}”`}</span> : null}
          </Callout>
          <div className="flex w-full items-start justify-between text-[14px] leading-[20px] whitespace-nowrap">
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Recorded</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{recorded ? dayMonthYear(recorded) : "—"}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Confirmed</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{confirmed ? dayMonthYear(confirmed) : "—"}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Renews</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{dayMonthYear(row.renewalDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Evidence</span>
          <div className="grid h-[132px] w-full shrink-0 grid-cols-2 grid-rows-2 overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white text-[14px] leading-[20px] whitespace-nowrap">
            <div className="flex flex-col gap-[4px] border-b border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Seats active</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {seats ? `${seats.active} of ${seats.purchased} (${Math.round((seats.active / seats.purchased) * 100)}%)` : row.usage}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-b border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Price change</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {yoy === undefined ? "Not tracked" : `${yoy > 0 ? "+" : ""}${yoy}% vs last year`}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Annual value</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">
                {perSeat !== undefined ? `${row.contractAmount} ($${perSeat.toLocaleString("en-US")} per seat)` : row.contractAmount}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Renewal type</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{`${row.contractType}, ${row.noticeDays}-day notice`}</span>
            </div>
          </div>
        </div>

        {decision && !decision.confirmedAt && decision.action === "Renegotiate" ? (
          <div className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
            <span className="text-[14px] font-medium text-[#18181b]">
              {row.daysToDecideBy < 0 ? "Renegotiation stalled?" : "Renegotiation in progress"}
            </span>
            <span className="text-[13px] text-[#52525b]">Log what the vendor said. If they&apos;ve gone quiet, send a protective notice so the cancel option stays open.</span>
            <Textarea
              value={vendorNote}
              onChange={(event) => setVendorNote(event.target.value)}
              aria-label="Vendor response"
              rows={2}
              placeholder="What did the vendor say?"
            />
            <div className="flex flex-wrap gap-[8px]">
              <Button variant="secondary" size="small" disabled={!vendorNote.trim()} onClick={() => {
                logVendorResponse(slug, vendorNote.trim());
                setVendorNote("");
              }}>
                Log vendor response
              </Button>
              {!decision.noticeSentAt && row.daysToDecideBy < 0 ? (
                <Button variant="secondary" size="small" onClick={() => recordNotice(slug, { sentAt: stamp(), method: "Email to account executive" })}>
                  Send protective notice
                </Button>
              ) : null}
              <Button variant="primary" size="small" onClick={() => confirmDecision(slug, { ...decision, confirmedAt: stamp() })}>
                Confirm outcome
              </Button>
            </div>
          </div>
        ) : null}

        {decision?.action === "Right-size" && decision.noticeSentAt ? (
          <div className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
            <span className="text-[14px] font-medium text-[#18181b]">Vendor didn&apos;t apply the change?</span>
            <span className="text-[13px] text-[#52525b]">
              {`Notice sent ${decision.noticeSentAt.slice(0, 10)}${decision.noticeMethod ? ` by ${decision.noticeMethod.toLowerCase()}` : ""}${decision.vendorReference ? `, ref ${decision.vendorReference}` : ""}.`}
            </span>
            <div className="flex flex-wrap items-center gap-[8px]">
              <Input
                value={disputeSeats}
                onChange={(event) => setDisputeSeats(event.target.value)}
                aria-label="Seats on the invoice"
                placeholder="Seats on the invoice"
                className="w-[180px]"
              />
              <Button variant="secondary" size="small" disabled={!disputeSeats.trim()} onClick={() => {
                logVendorResponse(slug, `Dispute: invoice shows ${disputeSeats.trim()} seats; decision was ${decision.targetOutcome ?? "a seat reduction"}. Notice record: ${decision.noticeSentAt?.slice(0, 10)}${decision.vendorReference ? `, ref ${decision.vendorReference}` : ""}.`);
                setDisputeSeats("");
              }}>
                Log dispute
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Status</span>
          <span className="text-[14px] leading-[20px] tracking-[-0.035px] text-[#18181b]">
            {confirmed
              ? `The outcome was confirmed on ${dayMonthYear(confirmed)}. This renewal no longer needs action.`
              : "The decision is recorded and awaiting confirmation."}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
