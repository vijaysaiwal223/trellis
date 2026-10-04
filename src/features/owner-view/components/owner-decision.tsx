"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OWNER_NAME } from "@/components/layout/profile-state";
import { dayMonthYear, dayMonth } from "@/lib/dates";
import { people } from "@/config/people";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useAssessedRenewals, renewals } from "@/features/renewal-risk";
import { actionLabel, type DecisionAction } from "@/features/renewal-detail/types";

type Choice = { action: DecisionAction; label: string; detail: string };

/** The owner's recommendation: pick an option, say why, send it to the renewal lead. */
export function OwnerDecision({ slug }: { slug: string }) {
  const { resolutions, recordRecommendation, askOwnerQuestion, departedOwners } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const recommendation = resolutions[slug]?.recommendation;
  const decision = resolutions[slug]?.decision;
  const questions = resolutions[slug]?.questions ?? [];
  const [handoffTo, setHandoffTo] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffSent, setHandoffSent] = useState(false);
  const [reply, setReply] = useState("");
  const handoffOptions = people.filter((person) => person.name !== OWNER_NAME && !departedOwners.includes(person.name));
  const decidedWithoutYou = Boolean(decision) && !recommendation;

  const seatsDefault = row?.seats ? Math.min(row.seats.purchased, Math.max(1, Math.round(row.seats.active * 1.1))) : 0;
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

  if (!row) return <p className="p-[24px] text-[14px] text-ui-fg-subtle">This renewal doesn&apos;t exist.</p>;
  if (row.owner !== OWNER_NAME) {
    return (
      <div className="flex flex-col gap-[12px] p-[24px]">
        <p className="text-[14px] text-ui-fg-base">This renewal isn&apos;t assigned to you.</p>
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
      <Link href="/owner" className="text-[13px] text-ui-fg-subtle hover:underline">← My renewals</Link>

      <div className="flex flex-col gap-[6px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[20px_24px]">
        <span className="text-[12px] text-ui-fg-subtle">{`Decision request from ${row.owner ? "Anika Rao" : "the lead"} · decide by ${dayMonth(row.decideByISO)}`}</span>
        <h1 className="text-[22px] font-semibold text-ui-fg-base">{`What should we do with ${row.vendor} at renewal?`}</h1>
        <p className="text-[14px] text-ui-fg-subtle">
          It {row.contractType === "Auto-renew" ? "auto-renews" : "renews"} on {dayMonthYear(row.renewalDate)} and needs {row.noticeDays} days&apos; notice, so changes must reach the vendor by {dayMonthYear(row.decideByISO)}.
        </p>
      </div>

      {decidedWithoutYou && decision ? (
        <div className="rounded-[10px] border border-solid border-[#f1d3ae] bg-[#fdf0e1] p-[16px_20px] text-[14px] text-[#5a2c00]">
          <span className="block text-[18px] font-semibold text-ui-fg-base">{`Anika already decided on ${row.vendor}`}</span>
          <span className="block text-[14px]">{`Your recommendation didn't arrive before the escalation date, so the decision was ${actionLabel(decision.action).toLowerCase()}. It stays on the record, and you can still reply below.`}</span>
        </div>
      ) : null}

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
          { label: "Renews", value: dayMonthYear(row.renewalDate), detail: row.contractType },
        ].map((card) => (
          <div key={card.label} className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
            <span className="text-[12px] text-ui-fg-subtle">{card.label}</span>
            <span className="text-[20px] font-medium text-ui-fg-base">{card.value}</span>
            {card.detail ? <span className="text-[12px] text-ui-fg-subtle">{card.detail}</span> : null}
          </div>
        ))}
      </div>

      {!decidedWithoutYou ? (
      <form
        className="flex flex-col gap-[12px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[20px_24px]"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h2 className="text-[16px] font-semibold text-ui-fg-base">Your recommendation</h2>
        <div role="radiogroup" aria-label="Recommendation" className="flex flex-col gap-[8px]">
          {choices.map((option) => {
            const on = option.action === choice;
            return (
              <label
                key={option.action}
                className={`flex cursor-pointer items-start gap-[12px] rounded-[8px] border border-solid p-[12px_14px] ${
                  on ? "border-[#2563eb] bg-[#f3f6fd]" : "border-ui-border-base"
                }`}
              >
                <input
                  type="radio"
                  name="recommendation"
                  checked={on}
                  onChange={() => setChoice(option.action)}
                  className="mt-[3px]"
                />
                <span className="flex min-w-px flex-1 flex-col">
                  <span className="font-medium text-ui-fg-base">{option.label}</span>
                  <span className="text-[12px] text-ui-fg-subtle">{option.detail}</span>
                  {option.action === "Right-size" && on ? (
                    <span className="mt-[8px] flex items-center gap-[8px]">
                      <span className="text-[12px] text-ui-fg-subtle">New seat count</span>
                      <input
                        type="number"
                        min={1}
                        max={row.seats?.purchased}
                        value={seatCount}
                        onChange={(event) => setSeats(Number(event.target.value))}
                        aria-label="New seat count"
                        className="h-[32px] w-[88px] rounded-[6px] border border-solid border-[#bdbdb7] px-[8px] text-[14px]"
                      />
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        <label htmlFor="why" className="text-[13px] font-medium text-ui-fg-base">
          Why? <span className="font-normal text-ui-fg-subtle">Anika sees this with your choice</span>
        </label>
        <textarea
          id="why"
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          rows={3}
          className="resize-y rounded-[6px] border border-solid border-[#bdbdb7] p-[10px] text-[14px]"
        />
        <div className="flex flex-wrap items-center gap-[8px]">
          <button type="submit" className="h-[36px] rounded-[6px] bg-[#2876f5] px-[14px] text-[14px] font-medium text-white">
            {recommendation ? "Update recommendation" : "Send recommendation to Anika"}
          </button>
          <span className="text-[12px] text-ui-fg-subtle">This doesn&apos;t commit anything. Anika records the final decision.</span>
        </div>
      </form>
      ) : null}

      <div className="flex flex-col gap-[10px] rounded-[10px] border border-solid border-ui-border-base bg-white p-[16px_20px]">
        <span className="text-[14px] font-semibold text-ui-fg-base">Not the right person?</span>
        {handoffSent ? (
          <span className="text-[13px] text-ui-tag-green-text">Sent to Anika. She confirms the switch.</span>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-[8px]">
              <select
                value={handoffTo}
                onChange={(event) => setHandoffTo(event.target.value)}
                aria-label="Suggest someone else"
                className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] bg-white px-[8px] text-[14px]"
              >
                <option value="">Choose a colleague</option>
                {handoffOptions.map((person) => (
                  <option key={person.name} value={person.name}>{`${person.name} · ${person.team}`}</option>
                ))}
              </select>
              <input
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                aria-label="Note for Anika"
                placeholder="Why them?"
                className="h-[36px] min-w-[220px] flex-1 rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[14px]"
              />
              <button
                type="button"
                disabled={!handoffTo}
                onClick={() => {
                  askOwnerQuestion(slug, `Suggests handing ${row.vendor} to ${handoffTo}${handoffNote.trim() ? `: ${handoffNote.trim()}` : "."}`);
                  setHandoffSent(true);
                }}
                className="h-[36px] rounded-[6px] bg-white px-[12px] text-[14px] font-medium shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] disabled:opacity-40"
              >
                Suggest a handoff
              </button>
            </div>
            <span className="text-[12px] text-ui-fg-subtle">The due date doesn&apos;t move. Anika confirms any switch.</span>
          </>
        )}
      </div>

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
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              aria-label="Reply to Anika"
              placeholder="Reply to Anika"
              className="h-[36px] flex-1 rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[14px]"
            />
            <button
              type="button"
              disabled={!reply.trim()}
              onClick={() => {
                askOwnerQuestion(slug, `Owner reply: ${reply.trim()}`);
                setReply("");
              }}
              className="h-[36px] rounded-[6px] bg-white px-[12px] text-[14px] font-medium shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
