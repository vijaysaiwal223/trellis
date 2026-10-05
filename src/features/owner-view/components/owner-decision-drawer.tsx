"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";

import { OWNER_NAME } from "@/components/layout/profile-state";
import { dayMonth, dayMonthYear } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewals, renewalStage } from "@/features/renewal-risk";
import type { DecisionAction } from "@/features/renewal-detail/types";
import { Avatar, Badge, Button, Container, Heading, IconButton, Input, Label, RadioGroup, Text } from "@medusajs/ui";

type Choice = { action: DecisionAction; label: string; detail: string };
const dueLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** The owner's recommendation, opened from "Make your call" beside the dashboard table. */
export function OwnerDecisionDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, recordRecommendation, askOwnerQuestion } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const requestedAt = resolutions[slug]?.ownerRequest;
  const recommendation = resolutions[slug]?.recommendation;

  const seatsDefault = row?.seats ? Math.min(row.seats.purchased, Math.max(1, Math.round(row.seats.active * 1.15))) : 0;
  const [choice, setChoice] = useState<DecisionAction>("Renew");
  const [seats, setSeats] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const seatCount = seats ?? seatsDefault;

  const perSeat = row?.seats ? row.contractValue / row.seats.purchased : undefined;
  const estimate = perSeat !== undefined ? Math.round(seatCount * perSeat) : undefined;
  const saving = estimate !== undefined && row ? row.contractValue - estimate : undefined;

  const choices = useMemo<Choice[]>(() => {
    if (!row) return [];
    return [
      { action: "Renew", label: "Renew as is", detail: `${row.contractAmount} for ${row.seats?.purchased ?? "current"} seats` },
      {
        action: "Right-size",
        label: "Reduce seats",
        detail: estimate !== undefined ? `Est. $${estimate.toLocaleString("en-US")}/yr • saves about $${(saving ?? 0).toLocaleString("en-US")}` : "Fewer seats",
      },
      { action: "Renegotiate", label: "Renegotiate price", detail: "Keep the seats, push back on the price increase" },
      { action: "Cancel", label: "Cancel", detail: "Stop using this tool at renewal" },
    ];
  }, [row, estimate, saving]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row) return null;
  const stage = renewalStage(row, resolutions[slug]);
  const needsCall = stage === "awaiting-owner";
  const requested = requestedAt ? `sent ${dayMonth(requestedAt.sentAt.slice(0, 10))} • ` : "";

  const submit = () => {
    recordRecommendation(slug, {
      action: choice,
      targetOutcome: choice === "Right-size" ? `Reduce to ${seatCount} seats` : undefined,
      note: "",
      submittedAt: stamp(),
    });
    onClose();
  };

  return (
    <Container className="flex h-full min-h-0 w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white p-0 shadow-none">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-center gap-[10px]">
          <Avatar variant="squared" size="large" src={row.logo || undefined} fallback={row.vendor.slice(0, 2).toUpperCase()} />
          <div className="flex flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-[4px]">
              <Text as="span" weight="plus" className="text-[16px] leading-[20px] text-ui-fg-base">{row.vendor}</Text>
              {needsCall ? <Badge color="orange" size="xsmall">Need your call</Badge> : null}
            </div>
            <Text as="span" className="text-[14px] leading-[16px] text-ui-fg-subtle">{`Owner: ${OWNER_NAME}, Sales Ops`}</Text>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <div className="flex shrink-0 flex-col gap-[8px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <Text className="text-[14px] leading-[16px] text-ui-fg-subtle">
          {`Decision request from Anika Rao • ${requested}Due ${dueLabel(requestedAt?.dueBy ?? row.decideByISO)}`}
        </Text>
        <Heading level="h2" className="text-[16px] font-medium leading-[24px] text-ui-fg-base">{`What should we do with ${row.vendor} at renewal?`}</Heading>
        <Text className="text-[14px] leading-[20px] text-ui-fg-base">
          {`It auto-renews on ${dayMonthYear(row.renewalDate)} and needs ${row.noticeDays} days notice, so changes must reach the vendor by ${dayMonthYear(row.cancelByISO)}.`}
        </Text>
      </div>

      <div className="shrink-0 border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-solid border-[#e4e4e7]">
        {[
          { label: "Annual value", value: row.contractAmount, detail: perSeat ? `$${Math.round(perSeat).toLocaleString("en-US")} per seat` : "" },
          { label: "Seats active", value: row.seats ? `${row.seats.active}/${row.seats.purchased}` : row.usage, detail: row.seats ? `${row.seats.purchased - row.seats.active} unused` : "" },
          { label: "Price change", value: row.yoyPercent !== undefined ? `${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}%` : "Not tracked", detail: "vs last year" },
          { label: "Notice deadline", value: dayMonth(row.cancelByISO), detail: row.daysToCancelBy < 0 ? "Deadline passed" : `${row.daysToCancelBy} days from today` },
        ].map((cell, index) => (
          <div key={cell.label} className={`flex flex-col gap-[4px] p-[12px] ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b" : ""} border-solid border-[#e4e4e7]`}>
            <Text as="span" className="text-[14px] leading-[20px] text-ui-fg-subtle">{cell.label}</Text>
            <Text as="span" weight="plus" className="text-[14px] leading-[20px] text-ui-fg-base">{cell.value}</Text>
            {cell.detail ? <Text as="span" className="text-[14px] leading-[20px] text-ui-fg-subtle">{cell.detail}</Text> : null}
          </div>
        ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto p-[16px]">
        <Heading level="h3" className="text-[14px] font-medium leading-[20px] text-ui-fg-base">
          {recommendation ? "Update your recommendation" : "Your recommendation"}
        </Heading>
        <RadioGroup value={choice} onValueChange={(value) => setChoice(value as DecisionAction)} aria-label="Recommendation" className="flex flex-col gap-[4px]">
          {choices.map((option) => (
            <Label
              key={option.action}
              htmlFor={`recommend-${option.action}`}
              className="flex cursor-pointer items-start gap-[12px] rounded-[12px] border border-solid border-[#e4e4e7] bg-white px-[10px] py-[12px] hover:bg-[#fafafa]"
            >
              <RadioGroup.Item id={`recommend-${option.action}`} value={option.action} className="mt-[2px]" />
              <span className="flex min-w-px flex-1 flex-col">
                <Text as="span" weight="plus" className="text-[14px] leading-[20px] text-ui-fg-base">{option.label}</Text>
                <Text as="span" className="text-[14px] leading-[20px] text-ui-fg-subtle">{option.detail}</Text>
                {option.action === "Right-size" && choice === "Right-size" ? (
                  <span className="mt-[8px] flex items-center gap-[8px]">
                    <Text as="span" className="text-[12px] text-ui-fg-subtle">New seat count</Text>
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
        {asking ? (
          <div className="flex items-center gap-[8px]">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Question for Anika" placeholder="Your question for Anika" className="flex-1" />
            <Button
              variant="secondary"
              size="small"
              disabled={!question.trim()}
              onClick={() => {
                askOwnerQuestion(slug, `Question: ${question.trim()}`);
                setQuestion("");
                setAsking(false);
              }}
            >
              Send question
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={() => setAsking((open) => !open)}>
          Ask Anika a question
        </Button>
        <Button variant="primary" size="small" onClick={submit}>
          {recommendation ? "Update recommendation" : "Send recommendation to Anika"}
        </Button>
      </div>
    </Container>
  );
}
