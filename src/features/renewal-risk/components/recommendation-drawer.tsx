"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { actionLabel, type DecisionAction } from "@/features/renewal-detail/types";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { daysBetween, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import type { Renewal } from "../types";
import { Badge, Button, IconButton, Label, RadioGroup, Textarea } from "@medusajs/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "7 Oct" */
const dayMonth = (iso: ISODate) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

const firstName = (name: string) => name.split(" ")[0];

const contractWord = (type: Renewal["contractType"]) =>
  type === "Auto-renew" ? "Auto-renew" : type === "Manual" ? "Manual" : "Month-to-month";

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-[4px]">
      <div className="flex h-full items-stretch self-stretch">
        <div className="h-full w-[4px] rounded-full bg-[#3b82f6]" />
      </div>
      <div className="flex min-w-px flex-1 flex-col gap-[12px] rounded-bl-[4px] rounded-br-[8px] rounded-tl-[4px] rounded-tr-[8px] border-[0.5px] border-solid border-[#93c5fd] bg-[#dbeafe] p-[12px]">
        {children}
      </div>
    </div>
  );
}

type Choice = { key: string; label: string; action: DecisionAction; targetOutcome?: string };

/**
 * Review of the owner's recommendation. Shows the advice beside the facts behind it,
 * then records the decision, which can differ from the advice.
 */
export function RecommendationDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, confirmDecision, askOwnerQuestion } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const recommendation = resolutions[slug]?.recommendation;

  const [chosen, setChosen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const choices = useMemo<Choice[]>(() => {
    if (!recommendation) return [];
    const accept: Choice = {
      key: "accept",
      label: `Accept: ${recommendation.targetOutcome ?? actionLabel(recommendation.action)}`,
      action: recommendation.action,
      targetOutcome: recommendation.targetOutcome,
    };
    const others: Choice[] = [
      { key: "renew", label: "Renew as is", action: "Renew" },
      { key: "renegotiate", label: "Renegotiate price", action: "Renegotiate" },
      { key: "cancel", label: "Cancel", action: "Cancel" },
    ].filter((option) => option.action !== recommendation.action) as Choice[];
    return [accept, ...others];
  }, [recommendation]);

  if (!row || !recommendation) return null;

  const selectedKey = chosen ?? choices[0]?.key;
  const selected = choices.find((choice) => choice.key === selectedKey) ?? choices[0];
  const owner = row.owner ?? "The owner";
  const ownerFirst = firstName(owner);

  // Where today sits between the decide-by date and the renewal date.
  const today = row.decideByISO < row.renewalDate ? row.decideByISO : row.renewalDate;
  const spanDays = Math.max(1, daysBetween(today, row.renewalDate));
  const decidePercent = Math.min(100, Math.max(0, (daysBetween(today, row.decideByISO) / spanDays) * 100));

  const targetSeats = /(\d+) seats/.exec(recommendation.targetOutcome ?? "")?.[1];
  const seats = row.seats;
  // Only a reduction can be estimated; a target above today's seats isn't a saving.
  const acceptedValue =
    recommendation.action === "Right-size" && targetSeats && seats && Number(targetSeats) < seats.purchased
      ? Math.round((row.contractValue * Number(targetSeats)) / seats.purchased)
      : undefined;
  const yoy = row.yoyPercent;

  const submit = () => {
    if (!selected) return;
    confirmDecision(row.id, {
      action: selected.action,
      note: "",
      ownerName: row.owner ?? undefined,
      targetOutcome: selected.targetOutcome,
      renewalStatus: selected.action,
      recordedAt: stamp(),
    });
    onClose();
  };

  const sendQuestion = () => {
    const text = question.trim();
    if (!text) return;
    askOwnerQuestion(row.id, text);
    setQuestion("");
    setAsking(false);
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
              <span className="whitespace-nowrap text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">
                {row.vendor}
              </span>
              <Badge color="blue" size="xsmall" className="whitespace-nowrap">Recommendation in</Badge>
            </div>
            <div className="flex gap-[4px] text-[14px] leading-[16px] tracking-[-0.07px] whitespace-nowrap text-[#52525b]">
              <span>{row.subtitle}</span>
              <span>•</span>
              <span>{row.owner ? `Owner: ${row.owner}${row.team ? `, ${row.team}` : ""}` : "No owner"}</span>
            </div>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Deadline</span>
          <div className="flex h-[12px] w-full items-center overflow-clip rounded-[4px] bg-[#ffe9ea]">
            <div className="flex h-full items-center rounded-[4px] bg-[#dae6fc]" style={{ width: `${decidePercent}%` }} />
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

        <div className="flex flex-col gap-[16px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">{`${ownerFirst} recommends`}</span>
          <Callout>
            <div className="flex flex-col gap-[4px] text-[14px] text-[#18181b]">
              <span className="font-medium leading-[20px] tracking-[-0.07px]">
                {recommendation.targetOutcome ?? actionLabel(recommendation.action)}
              </span>
              {recommendation.note ? (
                <span className="leading-[20px] tracking-[-0.035px]">{`“${recommendation.note}”`}</span>
              ) : null}
            </div>
          </Callout>
          <div className="flex w-full items-start justify-between text-[14px] leading-[20px] whitespace-nowrap">
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Today</span>
              <span className="text-[16px] font-medium tracking-[-0.16px] text-[#18181b]">{row.contractAmount}</span>
              <span className="text-[#52525b] tracking-[-0.07px]">{seats ? `${seats.purchased} seats` : row.usage}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">If accepted (est.)</span>
              <span className="text-[16px] font-medium tracking-[-0.16px] text-[#18181b]">
                {acceptedValue ? `$${acceptedValue.toLocaleString("en-US")}` : "—"}
              </span>
              <span className="text-[#52525b] tracking-[-0.07px]">{targetSeats ? `${targetSeats} seats` : "Not estimated"}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Saving</span>
              <span className="text-[16px] font-medium tracking-[-0.16px] text-[#18181b]">
                {acceptedValue ? `-$${(row.contractValue - acceptedValue).toLocaleString("en-US")}/yr` : "—"}
              </span>
              <span className="text-[#52525b] tracking-[-0.07px]">before any new price</span>
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
              <span className="text-[#52525b] tracking-[-0.07px]">Renewal type</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{`${contractWord(row.contractType)}, ${row.noticeDays}-day notice`}</span>
            </div>
            <div className="flex flex-col gap-[4px] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Annual value</span>
              <span className="font-medium tracking-[-0.14px] text-[#18181b]">{row.contractAmount}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Your decision</span>
          <RadioGroup value={selected?.key} onValueChange={setChosen} aria-label="Your decision" className="flex w-full flex-col gap-[4px]">
            {choices.map((choice) => (
              <Label
                key={choice.key}
                htmlFor={`decision-${choice.key}`}
                className="flex w-full cursor-pointer items-center gap-[12px] rounded-[12px] border border-solid border-[#e4e4e7] bg-white px-[10px] py-[14px] hover:bg-[#fafafa]"
              >
                <RadioGroup.Item id={`decision-${choice.key}`} value={choice.key} />
                <span className="whitespace-nowrap">{choice.label}</span>
              </Label>
            ))}
          </RadioGroup>
          <span className="text-[14px] leading-[20px] tracking-[-0.035px] text-[#18181b]">
            {`Any change needs written notice to ${row.vendor} by ${dayMonth(row.decideByISO)}. We’ll walk you through it next.`}
          </span>
          {asking ? (
            <div className="flex flex-col gap-[8px]">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                aria-label={`Question for ${ownerFirst}`}
                rows={3}
                placeholder={`What do you want to ask ${ownerFirst}?`}
              />
              <div className="flex justify-end gap-[8px]">
                <Button variant="secondary" size="small" onClick={() => setAsking(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="small" onClick={sendQuestion} disabled={!question.trim()}>
                  Send question
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={() => setAsking((open) => !open)}>
          {`Ask ${ownerFirst} a question`}
        </Button>
        <Button variant="primary" size="small" onClick={submit} disabled={!selected}>
          Record decision
        </Button>
      </div>
    </div>
  );
}
