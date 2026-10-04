"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { dayMonth, dayMonthYear } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import type { DecisionAction } from "@/features/renewal-detail/types";
import { Badge, Button, IconButton, Input, Label, RadioGroup, Textarea } from "@medusajs/ui";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { Stepper, renewalJourney } from "@/components/ui/stepper";

type Choice = { key: string; label: string; detail: string; action: DecisionAction };

/**
 * A request sent to the renewal lead, who is also the owner of the tool. There is
 * no one else to advise, so the lead records the decision directly.
 */
export function SelfDecisionDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const requestedAt = resolutions[slug]?.ownerRequest?.sentAt.slice(0, 10);

  const seatsDefault = row?.seats ? Math.min(row.seats.purchased, Math.max(1, Math.round(row.seats.active * 1.15))) : 0;
  const [choice, setChoice] = useState<DecisionAction>("Renew");
  const [seats, setSeats] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const seatCount = seats ?? seatsDefault;

  const perSeat = row?.seats ? row.contractValue / row.seats.purchased : undefined;
  const estimate = perSeat !== undefined ? Math.round(seatCount * perSeat) : undefined;
  const saving = estimate !== undefined && row ? row.contractValue - estimate : undefined;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const choices = useMemo<Choice[]>(() => {
    if (!row) return [];
    return [
      { key: "renew", action: "Renew", label: "Renew as is", detail: `${row.contractAmount} for ${row.seats?.purchased ?? "current"} seats` },
      {
        key: "right-size",
        action: "Right-size",
        label: "Reduce seats",
        detail: estimate !== undefined ? `Est. $${estimate.toLocaleString("en-US")}/yr · saves about $${(saving ?? 0).toLocaleString("en-US")}` : "Fewer seats",
      },
      { key: "renegotiate", action: "Renegotiate", label: "Renegotiate price", detail: "Keep the seats, push back on the price increase" },
      { key: "cancel", action: "Cancel", label: "Cancel", detail: "Stop using this tool at renewal" },
    ];
  }, [row, estimate, saving]);

  if (!row) return null;

  const submit = () => {
    confirmDecision(row.id, {
      action: choice,
      note: why.trim(),
      ownerName: SIGNED_IN_NAME,
      targetOutcome: choice === "Right-size" ? `Reduce to ${seatCount} seats` : undefined,
      renewalStatus: choice,
      recordedAt: stamp(),
    });
    onClose();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-start gap-[10px]">
          <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-white p-[2px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
            {row.logo ? (
              <img alt="" className="size-full rounded-[5px] object-cover" src={row.logo} />
            ) : (
              <span className="text-[12px] font-medium text-[#52525b]">{row.vendor.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <div className="flex flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">{`Decide ${row.vendor}`}</span>
              <Badge color="grey" size="xsmall">Awaiting owner</Badge>
            </div>
            <span className="text-[14px] leading-[16px] text-[#52525b]">
              {`Requested from you${requestedAt ? ` · ${dayMonth(requestedAt)}` : ""} · decide by ${dayMonth(row.cancelByISO)}`}
            </span>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <Stepper steps={renewalJourney} current={2} />
      <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto p-[16px]">
        <div className="grid grid-cols-2 gap-[12px]">
          {[
            { label: "Annual value", value: row.contractAmount, detail: perSeat ? `$${Math.round(perSeat).toLocaleString("en-US")} per seat` : "" },
            { label: "Seats active", value: row.seats ? `${row.seats.active} / ${row.seats.purchased}` : row.usage, detail: row.seats ? `${row.seats.purchased - row.seats.active} unused` : "" },
            { label: "Notice deadline", value: dayMonthYear(row.cancelByISO), detail: row.daysToCancelBy < 0 ? "Deadline passed" : `${row.daysToCancelBy} days from today` },
            { label: "Renews", value: dayMonthYear(row.renewalDate), detail: row.contractType },
          ].map((card) => (
            <div key={card.label} className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[12px] text-[#52525b]">{card.label}</span>
              <span className="text-[16px] font-medium text-[#18181b]">{card.value}</span>
              {card.detail ? <span className="text-[12px] text-[#52525b]">{card.detail}</span> : null}
            </div>
          ))}
        </div>

        <span className="text-[14px] font-medium text-[#18181b]">Your decision</span>
        <RadioGroup value={choice} onValueChange={(value) => setChoice(value as DecisionAction)} aria-label="Your decision" className="flex flex-col gap-[8px]">
          {choices.map((option) => (
            <Label
              key={option.key}
              htmlFor={`self-${option.key}`}
              className="flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid border-[#e4e4e7] p-[12px] hover:bg-[#fafafa]"
            >
              <RadioGroup.Item id={`self-${option.key}`} value={option.action} className="mt-[2px]" />
              <span className="flex min-w-px flex-1 flex-col">
                <span className="font-medium text-[#18181b]">{option.label}</span>
                <span className="text-[12px] text-[#52525b]">{option.detail}</span>
                {option.action === "Right-size" && choice === "Right-size" ? (
                  <span className="mt-[8px] flex items-center gap-[8px]">
                    <span className="text-[12px] text-[#52525b]">New seat count</span>
                    <Input
                      type="number"
                      min={1}
                      max={row.seats?.purchased}
                      value={seatCount}
                      onChange={(event) => setSeats(Number(event.target.value))}
                      aria-label="New seat count"
                      className="w-[88px]"
                    />
                  </span>
                ) : null}
              </span>
            </Label>
          ))}
        </RadioGroup>

        <Label htmlFor="self-why" size="small" weight="regular">
          Why? <span className="text-[#52525b]">This is recorded with your decision</span>
        </Label>
        <Textarea id="self-why" value={why} onChange={(event) => setWhy(event.target.value)} rows={3} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="small" onClick={submit}>
          Record decision
        </Button>
      </div>
    </div>
  );
}
