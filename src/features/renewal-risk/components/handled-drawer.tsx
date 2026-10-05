"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Stepper, renewalJourney } from "@/components/ui/stepper";
import { actionLabel, type DecisionAction } from "@/features/renewal-detail/types";
import { stamp } from "@/lib/clock";
import { dayMonthYear } from "@/lib/dates";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { Badge, Button, IconButton, Input, Textarea } from "@medusajs/ui";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import type { Renewal } from "../types";

const DECISION_WORDING: Record<string, string> = {
  Renew: "Renew as is",
  Renegotiate: "Renegotiate price",
  "Right-size": "Downsize seats",
  Cancel: "Cancel",
};

/** What the vendor has to show before the renewal can be closed. */
function doneWhen(action: DecisionAction, row: Renewal, targetOutcome?: string): string {
  if (action === "Right-size") return `their new order form or invoice shows ${targetOutcome?.match(/\d+/)?.[0] ?? "the new"} seats`;
  if (action === "Cancel") return `their written confirmation that the contract ends on ${dayMonthYear(row.renewalDate)}`;
  if (action === "Renegotiate") return "their new price, in writing";
  return "their confirmation of the renewal terms";
}

/**
 * A decision that is waiting on the vendor. The renewal stays open until the lead
 * records what the vendor did and confirms it. Once confirmed, the drawer becomes a record.
 */
export function HandledDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, logVendorResponse, recordNotice, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row: Renewal | undefined = assessed.find((entry) => entry.slug === slug)?.row;
  const decision = resolutions[slug]?.decision;
  const [reply, setReply] = useState("");
  const [disputeSeats, setDisputeSeats] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row || !decision) return null;

  const pending = !decision.confirmedAt;
  const wording = DECISION_WORDING[decision.action] ?? actionLabel(decision.action);
  const recorded = decision.recordedAt?.slice(0, 10);
  const confirmed = decision.confirmedAt?.slice(0, 10);
  const noticeSent = decision.noticeSentAt?.slice(0, 10);
  const seats = row.seats;
  const perSeat = seats ? Math.round(row.contractValue / seats.purchased) : undefined;
  const yoy = row.yoyPercent;

  const confirm = () => {
    logVendorResponse(slug, reply.trim());
    confirmDecision(slug, { ...decision, confirmedAt: stamp(), vendorReference: reply.trim() });
    setReply("");
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
              {pending ? (
                <Badge color="blue" size="xsmall" className="whitespace-nowrap">Awaiting outcome</Badge>
              ) : (
                <Badge color="green" size="xsmall" className="whitespace-nowrap">Handled</Badge>
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

      <Stepper steps={renewalJourney} current={pending ? renewalJourney.length - 1 : renewalJourney.length} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {pending ? (
          <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
            <Alert
              status="Information"
              title={`Waiting for ${row.vendor} to confirm`}
              actions={
                !noticeSent && row.daysToDecideBy < 0 ? (
                  <Button variant="secondary" size="small" onClick={() => recordNotice(slug, { sentAt: stamp(), method: "Email to account executive" })}>
                    Send protective notice
                  </Button>
                ) : undefined
              }
            >
              <span>{noticeSent ? `${wording} notice sent ${dayMonthYear(noticeSent)}.` : `${wording}. Written notice still needs to be sent.`}</span>
              <span>{`Done when ${doneWhen(decision.action, row, decision.targetOutcome)}.`}</span>
            </Alert>

            <div className="flex flex-col gap-[6px]">
              <span className="text-[14px] font-medium text-[#18181b]">Vendor&apos;s reply or reference</span>
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                aria-label="Vendor's reply or reference"
                rows={2}
                placeholder="e.g. Email from Dana, 9 Oct, or invoice INV-204"
              />
              <span className="text-[12px] text-[#52525b]">Confirming needs the vendor&apos;s reply, so the renewal can close with evidence.</span>
            </div>

            {decision.action === "Right-size" && noticeSent ? (
              <div className="flex flex-col gap-[6px] border-t border-solid border-[#e4e4e7] pt-[12px]">
                <span className="text-[14px] font-medium text-[#18181b]">Invoice still shows the old seats?</span>
                <div className="flex flex-wrap items-center gap-[8px]">
                  <Input
                    value={disputeSeats}
                    onChange={(event) => setDisputeSeats(event.target.value)}
                    aria-label="Seats on the invoice"
                    placeholder="Seats on the invoice"
                    className="w-[180px]"
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={!disputeSeats.trim()}
                    onClick={() => {
                      logVendorResponse(slug, `Dispute: invoice shows ${disputeSeats.trim()} seats; decision was ${decision.targetOutcome ?? "a seat reduction"}. Notice sent ${noticeSent}.`);
                      setDisputeSeats("");
                    }}
                  >
                    Log dispute
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
            <span className="text-[14px] font-medium leading-[20px] text-[#18181b]">Decision recorded</span>
            <Alert status="Success">
              <span className="font-medium leading-[20px]">{decision.targetOutcome ? `${wording}: ${decision.targetOutcome}` : wording}</span>
            </Alert>
            <div className="flex w-full items-start justify-between text-[14px] leading-[20px] whitespace-nowrap">
              <div className="flex flex-col gap-[4px]">
                <span className="text-[#52525b]">Recorded</span>
                <span className="font-medium text-[#18181b]">{recorded ? dayMonthYear(recorded) : "—"}</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[#52525b]">Confirmed</span>
                <span className="font-medium text-[#18181b]">{confirmed ? dayMonthYear(confirmed) : "—"}</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[#52525b]">Renews</span>
                <span className="font-medium text-[#18181b]">{dayMonthYear(row.renewalDate)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] text-[#18181b]">Evidence</span>
          <div className="grid h-[132px] w-full shrink-0 grid-cols-2 grid-rows-2 overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white text-[14px] leading-[20px] whitespace-nowrap">
            <div className="flex flex-col gap-[4px] border-b border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b]">Seats active</span>
              <span className="font-medium text-[#18181b]">
                {seats ? `${seats.active} of ${seats.purchased} (${Math.round((seats.active / seats.purchased) * 100)}%)` : row.usage}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-b border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b]">Price change</span>
              <span className="font-medium text-[#18181b]">{yoy === undefined ? "Not tracked" : `${yoy > 0 ? "+" : ""}${yoy}% vs last year`}</span>
            </div>
            <div className="flex flex-col gap-[4px] border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b]">Annual value</span>
              <span className="font-medium text-[#18181b]">
                {perSeat !== undefined ? `${row.contractAmount} ($${perSeat.toLocaleString("en-US")} per seat)` : row.contractAmount}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] p-[12px]">
              <span className="text-[#52525b]">Renewal type</span>
              <span className="font-medium text-[#18181b]">{`${row.contractType}, ${row.noticeDays}-day notice`}</span>
            </div>
          </div>
        </div>

        {!pending ? (
          <div className="flex flex-col gap-[12px] p-[16px]">
            <span className="text-[14px] font-medium leading-[20px] text-[#18181b]">Status</span>
            <span className="text-[14px] leading-[20px] text-[#18181b]">
              {`The outcome was confirmed on ${dayMonthYear(confirmed ?? recorded ?? row.renewalDate)}. This renewal no longer needs action.`}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={onClose}>
          Close
        </Button>
        {pending ? (
          <Button variant="primary" size="small" disabled={!reply.trim()} onClick={confirm}>
            Confirm outcome
          </Button>
        ) : null}
      </div>
    </div>
  );
}
