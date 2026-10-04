"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OWNER_NAME } from "@/components/layout/profile-state";
import { dayMonthYear, dayMonth } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewals } from "@/features/renewal-risk";
import { actionLabel, type DecisionAction } from "@/features/renewal-detail/types";
import { Button, Heading, Input, Label, RadioGroup, Text, Textarea } from "@medusajs/ui";

/** "Mon 26 Oct": the weekday the owner's answer is due, as the request card shows it. */
const dueLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

type Choice = { action: DecisionAction; label: string; detail: string };

/** The owner's recommendation: pick an option, say why, send it to the renewal lead. */
export function OwnerDecision({ slug }: { slug: string }) {
  const { resolutions, recordRecommendation, askOwnerQuestion } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const recommendation = resolutions[slug]?.recommendation;
  const decision = resolutions[slug]?.decision;
  const questions = resolutions[slug]?.questions ?? [];
  const [reply, setReply] = useState("");
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const requestedAt = resolutions[slug]?.ownerRequest;

  // Keep a little headroom above the seats in use, so a reduction still covers hiring.
  const seatsDefault = row?.seats ? Math.min(row.seats.purchased, Math.max(1, Math.round(row.seats.active * 1.15))) : 0;
  const [choice, setChoice] = useState<DecisionAction>("Renew");
  const [seats, setSeats] = useState<number | null>(null);
  const [why, setWhy] = useState("");
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
        detail: estimate !== undefined ? `Est. $${estimate.toLocaleString("en-US")}/yr · saves about $${(saving ?? 0).toLocaleString("en-US")}` : "Fewer seats",
      },
      { action: "Renegotiate", label: "Renegotiate price", detail: "Keep the seats, push back on the price increase" },
      { action: "Cancel", label: "Cancel", detail: "Stop using this tool at renewal" },
    ];
  }, [row, estimate, saving]);

  if (!row) return <Text className="p-[24px] text-[14px] text-ui-fg-subtle">This renewal doesn&apos;t exist.</Text>;
  if (row.owner !== OWNER_NAME) {
    return (
      <div className="flex flex-col gap-[12px] p-[24px]">
        <Text className="text-[14px] text-ui-fg-base">This renewal isn&apos;t assigned to you.</Text>
        <Link href="/owner" className="text-[14px] font-medium text-ui-fg-interactive hover:underline">Back to my renewals</Link>
      </div>
    );
  }

  const submit = () => {
    recordRecommendation(slug, {
      action: choice,
      targetOutcome: choice === "Right-size" ? `Reduce to ${seatCount} seats` : undefined,
      note: why.trim(),
      submittedAt: stamp(),
    });
  };

  return (
    <div className="flex w-full flex-col gap-[16px] p-[24px]">
      <Link href="/owner" className="text-[13px] text-ui-fg-subtle hover:underline">← Your requests</Link>

      <div className="flex flex-col gap-[6px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[20px_24px]">
        <span className="text-[12px] text-ui-fg-subtle">
          {`Decision request from ${row.owner ? "Anika Rao" : "the lead"}${requestedAt ? ` · sent ${dayMonth(requestedAt.sentAt.slice(0, 10))}` : ""}`}
          {requestedAt ? ` · Due ${dueLabel(requestedAt.dueBy)}` : ""}
        </span>
        <Heading level="h1" className="text-[22px] font-semibold text-ui-fg-base">{`What should we do with ${row.vendor} at renewal?`}</Heading>
        <Text className="text-[14px] text-ui-fg-subtle">
          It {row.contractType === "Auto-renew" ? "auto-renews" : "renews"} on {dayMonthYear(row.renewalDate)} and needs {row.noticeDays} days&apos; notice, so changes must reach the vendor by {dayMonthYear(row.decideByISO)}.
        </Text>
      </div>

      {recommendation ? (
        <div className="flex flex-col gap-[8px] rounded-[10px] border border-solid border-[#bcccee] bg-[#f3f6fd] p-[16px_20px]">
          <span className="font-semibold text-ui-fg-base">{`You recommended: ${recommendation.targetOutcome ?? actionLabel(recommendation.action)}`}</span>
          {recommendation.note ? <span className="text-[14px] text-ui-fg-subtle">{`“${recommendation.note}”`}</span> : null}
          <span className="text-[13px] text-ui-fg-subtle">Anika records the final decision and sends notice to the vendor.</span>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-[12px]">
        {[
          { label: "Annual value", value: row.contractAmount, detail: row.seats ? `$${Math.round(perSeat ?? 0).toLocaleString("en-US")} per seat` : "" },
          { label: "Seats active", value: row.seats ? `${row.seats.active} / ${row.seats.purchased}` : row.usage, detail: row.seats ? `${row.seats.purchased - row.seats.active} unused` : "" },
          { label: "Price change", value: row.yoyPercent !== undefined ? `${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}%` : "Not tracked", detail: "vs last year" },
          { label: "Notice deadline", value: dayMonth(row.cancelByISO), detail: row.daysToCancelBy < 0 ? "Deadline passed" : `${row.daysToCancelBy} days from today` },
        ].map((card) => (
          <div key={card.label} className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
            <span className="text-[12px] text-ui-fg-subtle">{card.label}</span>
            <span className="text-[20px] font-medium text-ui-fg-base">{card.value}</span>
            {card.detail ? <span className="text-[12px] text-ui-fg-subtle">{card.detail}</span> : null}
          </div>
        ))}
      </div>

    <form
      className="flex flex-col gap-[12px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[20px_24px]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Heading level="h2" className="text-[16px] font-semibold text-ui-fg-base">Your recommendation</Heading>
      <RadioGroup value={choice} onValueChange={(value) => setChoice(value as DecisionAction)} aria-label="Recommendation" className="flex flex-col gap-[8px]">
        {choices.map((option) => {
          const on = option.action === choice;
          return (
            <label
              key={option.action}
              className={`flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid p-[12px_14px] ${
                on ? "border-[#2563eb] bg-[#f3f6fd]" : "border-ui-border-base"
              }`}
            >
              <RadioGroup.Item value={option.action} className="mt-[3px]" />
              <span className="flex min-w-px flex-1 flex-col">
                <span className="font-medium text-ui-fg-base">{option.label}</span>
                <span className="text-[12px] text-ui-fg-subtle">{option.detail}</span>
                {option.action === "Right-size" && on ? (
                  <span className="mt-[8px] flex items-center gap-[8px]">
                    <span className="text-[12px] text-ui-fg-subtle">New seat count</span>
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
            </label>
          );
        })}
      </RadioGroup>
      <Label htmlFor="why" size="small" weight="regular">
        Why? <span className="text-ui-fg-subtle">Anika sees this with your choice</span>
      </Label>
      <Textarea
        id="why"
        value={why}
        onChange={(event) => setWhy(event.target.value)}
        rows={3}
      />
      <div className="flex flex-wrap items-center gap-[8px]">
        <Button variant="primary" size="small" type="submit">
          {recommendation ? "Update recommendation" : "Send recommendation to Anika"}
        </Button>
        <Button variant="secondary" size="small" onClick={() => setAsking((open) => !open)}>
          Ask Anika a question
        </Button>
        <span className="text-[12px] text-ui-fg-subtle">This doesn&apos;t commit anything. Anika records the final decision.</span>
      </div>
      {asking ? (
        <div className="flex items-center gap-[8px]">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-label="Question for Anika"
            placeholder="Your question for Anika"
            className="flex-1"
          />
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
    </form>

      {recommendation || decision || questions.length > 0 ? (
        <div className="flex flex-col gap-[10px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[16px_20px]">
          <span className="text-[14px] font-semibold text-ui-fg-base">What happens next</span>
          <ol className="flex flex-col gap-[8px] text-[14px]">
            {recommendation ? (
              <li>{`You recommended ${recommendation.targetOutcome ?? actionLabel(recommendation.action)} · ${recommendation.submittedAt.slice(0, 10)}`}</li>
            ) : null}
            {questions.map((question) => (
              <li key={`${question.at}-${question.text}`} className="text-ui-fg-subtle">{`Asked: ${question.text}`}</li>
            ))}
            {decision?.recordedAt ? <li>{`Decision recorded: ${actionLabel(decision.action)} · ${decision.recordedAt.slice(0, 10)}`}</li> : null}
            {decision?.noticeSentAt ? <li>{`Notice sent · ${decision.noticeSentAt.slice(0, 10)}`}</li> : null}
          </ol>
          <div className="flex items-center gap-[8px] pt-[4px]">
            <Input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              aria-label="Reply to Anika"
              placeholder="Reply to Anika"
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="small"
              disabled={!reply.trim()}
              onClick={() => {
                askOwnerQuestion(slug, `Owner reply: ${reply.trim()}`);
                setReply("");
              }}
            >
              Send
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
