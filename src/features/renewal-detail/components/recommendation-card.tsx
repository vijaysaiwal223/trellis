"use client";

import { Avatar, Text, clx } from "@medusajs/ui";
import {
  RiArrowDownLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiSparklingLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { teamOf } from "@/config/people";
import { addDays, calendarDateIn, formatLongISO, type ISODate } from "@/features/renewal-risk/deadlines";
import type { Renewal } from "@/features/renewal-risk/types";
import { now, stamp } from "@/lib/clock";
import { isDecisionClosed, type DecisionRecord } from "@/lib/renewal-runtime-state";

import { actionLabel, type DecisionAction, type RenewalDetail } from "../types";

const NOTE_LIMIT = 500;

type DecisionOption = {
  action: DecisionAction;
  label: string;
  description: string;
  icon: RemixiconComponentType;
  iconClassName: string;
};

const decisionOptions: DecisionOption[] = [
  { action: "Renew", label: "Renew", description: "Keep the current terms", icon: RiCheckboxCircleLine, iconClassName: "text-ui-tag-green-icon" },
  { action: "Right-size", label: "Downsize", description: "Renew with fewer seats", icon: RiArrowDownLine, iconClassName: "text-ui-tag-orange-icon" },
  { action: "Cancel", label: "Cancel", description: "Do not renew", icon: RiCloseCircleLine, iconClassName: "text-ui-fg-error" },
];

// Once cancel-by has passed, ordinary cancellation isn't an option any more:
// the same three answers become requests the vendor has to agree to.
const recoveryOptions: DecisionOption[] = [
  { ...decisionOptions[0], label: "Accept renewal", description: "Keep the terms; confirm later" },
  { ...decisionOptions[1], label: "Negotiate downsize", description: "Ask for a smaller plan" },
  { ...decisionOptions[2], label: "Ask for goodwill cancellation", description: "The vendor must agree" },
];

/** The follow-through each answer leads to, shown once it is recorded. */
function nextStep(action: DecisionAction, vendor: string, row: Renewal, pastNotice: boolean): string {
  if (action === "Renew") return `Confirm the renewal terms with ${vendor}, then mark it confirmed.`;
  if (action === "Right-size") return `Ask ${vendor} for the reduced seat count in writing, then mark the new terms confirmed.`;
  return pastNotice
    ? `Ask ${vendor} to cancel as a goodwill exception. It isn't guaranteed: they have to agree.`
    : `Send ${vendor} written notice before ${row.cancelBy} and get their confirmation.`;
}

const confirmationLabel: Record<DecisionAction, string> = {
  Renew: "Mark renewal confirmed",
  "Right-size": "Mark new terms confirmed",
  Cancel: "Mark vendor cancellation confirmed",
};

/** When we'll check back, so the owner never has to pick a date. On or before cancel-by while that window is still open. */
function defaultFollowUp(action: DecisionAction, today: ISODate, row: Renewal): ISODate {
  if (row.daysToCancelBy < 0) return addDays(today, 2);
  const target = action === "Cancel" ? addDays(row.cancelByISO, -3) : addDays(today, action === "Right-size" ? 5 : 7);
  const capped = target > row.cancelByISO ? row.cancelByISO : target;
  return capped < today ? today : capped;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">{label}</Text>
      <Text as="span" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">{value}</Text>
    </div>
  );
}

type RecommendationCardProps = {
  detail: RenewalDetail;
  row: Renewal;
  /** Stored decision, if any. Shows the recorded state; "Edit decision" reopens the picker. */
  decision: DecisionRecord | null;
  ownerOptions: string[];
  currentOwnerName?: string;
  onSave: (decision: DecisionRecord) => void;
  onClose: () => void;
  /** Hands the contract to someone else. */
  onReassign: () => void;
  onAskBruno?: () => void;
  suggestedAction?: DecisionAction;
  suggestedReasoning?: string;
  suggestedConfidence?: number;
};

export function RecommendationCard({
  detail,
  row,
  decision,
  ownerOptions,
  currentOwnerName,
  onSave,
  onClose,
  onReassign,
  onAskBruno,
  suggestedAction,
  suggestedReasoning,
  suggestedConfidence,
}: RecommendationCardProps) {
  const today = calendarDateIn(now(), "UTC");
  const pastNotice = row.daysToCancelBy < 0;
  const options = pastNotice ? recoveryOptions : decisionOptions;
  const isFinal = !!decision && !decision.draft;
  const isClosed = isFinal && isDecisionClosed(decision!);
  const [editing, setEditing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const purchased = detail.plan.purchasedSeats;
  const active = detail.plan.activeSeats;
  const seatsFromDecision = /(\d+) seats/.exec(decision?.targetOutcome ?? "")?.[1];

  const [action, setAction] = useState<DecisionAction | null>(decision?.action ?? null);
  const [seats, setSeats] = useState(seatsFromDecision ?? (active > 0 && active < purchased ? String(active) : ""));
  const [note, setNote] = useState(decision?.note ?? "");
  const [showNote, setShowNote] = useState(Boolean(decision?.note));
  const [owner, setOwner] = useState(currentOwnerName ?? "");
  const [error, setError] = useState<string | null>(null);

  const needsOwnerPick = !currentOwnerName;
  const seatsNumber = Number(seats);
  const seatsValid = Number.isInteger(seatsNumber) && seatsNumber >= 1 && seatsNumber < purchased;

  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const record = () => {
    if (!action) return setError("Choose Renew, Downsize or Cancel.");
    if (needsOwnerPick && !ownerOptions.includes(owner)) return setError("Choose who is making this decision.");
    if (action === "Right-size" && !seatsValid) {
      return setError(`Enter how many seats you need: a whole number below the ${purchased} purchased.`);
    }
    setError(null);
    onSave({
      action,
      note: note.trim(),
      ownerName: currentOwnerName ?? owner,
      targetOutcome: action === "Right-size" ? `Reduce to ${seatsNumber} seats` : undefined,
      renewalStatus: "Not started",
      followUpBy: defaultFollowUp(action, today, row),
      recordedAt: decision?.recordedAt,
    });
    // Stay open: the recorded state is the confirmation, and says what happens next.
    setEditing(false);
  };

  const yoy = detail.contactDetails.find((entry) => entry.label === "YoY price change")?.value;
  const renews = row.contractType === "Auto-renew";
  const headline = pastNotice
    ? `The notice window for ${detail.vendor} closed ${-row.daysToCancelBy} day${row.daysToCancelBy === -1 ? "" : "s"} ago. It renews ${formatLongISO(row.renewalDate)} for ${row.contractAmount}.`
    : renews
      ? `${detail.vendor} renews ${formatLongISO(row.renewalDate)} for ${row.contractAmount} unless you act by ${row.cancelBy}.`
      : `${detail.vendor} is up for renewal on ${formatLongISO(row.renewalDate)} (${row.contractAmount}). Notice is due by ${row.cancelBy}.`;

  const showingRecorded = isFinal && !editing;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="renewal-decision-title" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout outline-none">
      <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar src={detail.logo} fallback={detail.vendor.slice(0, 2).toUpperCase()} variant="squared" size="base" />
          <div className="flex flex-col">
            <Text as="span" id="renewal-decision-title" className="text-[16px] font-medium leading-6 text-ui-fg-base">
              {showingRecorded ? "Decision recorded" : "Record renewal decision"}
            </Text>
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">{detail.vendor} · {detail.subtitle}</Text>
          </div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover">
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
        {showingRecorded ? (
          <>
            <Alert tone={isClosed ? "success" : "warning"}>
              <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                {isClosed ? "Outcome confirmed" : "Recorded"} · {actionLabel(decision!.action)}
                {decision!.targetOutcome ? ` (${decision!.targetOutcome.replace("Reduce to ", "to ")})` : ""}
              </Text>
            </Alert>
            {!isClosed ? (
              <div className="flex flex-col gap-1 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3">
                <Text as="span" className="text-[12px] font-medium uppercase tracking-wide text-ui-fg-muted">Next</Text>
                <Text as="p" className="text-[14px] leading-5 text-ui-fg-base">{nextStep(decision!.action, detail.vendor, row, pastNotice)}</Text>
                {decision!.followUpBy ? (
                  <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">We&apos;ll check back on {formatLongISO(decision!.followUpBy)}.</Text>
                ) : null}
              </div>
            ) : null}
            <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">
              Recorded as {decision!.ownerName ?? "an unassigned owner"}
              {decision!.recordedAt ? ` · ${new Date(decision!.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : ""}.
              {decision!.note ? ` Note: ${decision!.note}` : ""}
            </Text>
          </>
        ) : (
          <>
            <Text as="p" className="text-[15px] font-medium leading-6 text-ui-fg-base">{headline}</Text>

            {pastNotice ? (
              <Alert tone="danger">
                <Text as="span" className="text-[13px] leading-5 text-ui-fg-base">Cancel-by was {row.cancelBy}. Anything you choose now needs the vendor&apos;s agreement.</Text>
              </Alert>
            ) : null}

            <div className="grid grid-cols-3 gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3">
              <Fact label="Seats in use" value={`${active} of ${purchased} (${detail.plan.usagePercent}%)`} />
              <Fact label="Possible waste" value={detail.plan.possibleWaste} />
              <Fact label={yoy ? "Price change" : "Decide by"} value={yoy ?? row.decideBy} />
            </div>

            {suggestedAction ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-ui-border-base bg-ui-bg-interactive-soft p-3">
                <RiSparklingLine className="mt-0.5 size-4 shrink-0 text-ui-fg-interactive" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <Text as="p" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                    Bruno suggests {actionLabel(suggestedAction)}{suggestedConfidence !== undefined ? ` · ${suggestedConfidence}% confident` : ""}
                  </Text>
                  {suggestedReasoning ? <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">{suggestedReasoning}</Text> : null}
                </div>
                {action !== suggestedAction ? (
                  <Button variant="secondary" size="small" onClick={() => { setAction(suggestedAction); setError(null); }}>Use this</Button>
                ) : (
                  <Text as="span" className="shrink-0 text-[12px] font-medium text-ui-fg-interactive">Selected</Text>
                )}
              </div>
            ) : null}

            <div>
              <div role="group" aria-label="Renewal decision" className="grid w-full grid-cols-3 gap-2">
                {options.map((option) => {
                  const Icon = option.icon;
                  const selected = action === option.action;
                  return (
                    <button
                      key={option.action}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { setAction(option.action); setError(null); }}
                      className={clx(
                        "flex flex-col items-start gap-1 rounded-[8px] border px-3 py-2.5 text-left transition-colors",
                        selected ? "border-ui-bg-interactive bg-ui-bg-interactive-soft" : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle",
                      )}
                    >
                      <Icon className={`size-5 ${option.iconClassName}`} />
                      <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">{option.label}</Text>
                      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">{option.description}</Text>
                    </button>
                  );
                })}
              </div>
              {!suggestedAction && onAskBruno ? (
                <button type="button" onClick={onAskBruno} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ui-fg-interactive hover:underline">
                  <RiSparklingLine className="size-4" aria-hidden="true" />
                  Not sure? Ask Bruno
                </button>
              ) : null}
            </div>

            {action === "Right-size" ? (
              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">How many seats do you need?</Text>
                <input
                  type="text"
                  inputMode="numeric"
                  value={seats}
                  aria-invalid={Boolean(error) && !seatsValid}
                  onChange={(event) => { setSeats(event.target.value); setError(null); }}
                  placeholder={`Currently ${purchased} purchased, ${active} active`}
                  className="h-9 w-full max-w-[240px] rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                />
              </label>
            ) : null}

            {needsOwnerPick ? (
              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">Who is making this decision?</Text>
                <select
                  value={ownerOptions.includes(owner) ? owner : ""}
                  onChange={(event) => { setOwner(event.target.value); setError(null); }}
                  className="h-9 w-full max-w-[280px] rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                >
                  <option value="" disabled>Select a person</option>
                  {ownerOptions.map((name) => (
                    <option key={name} value={name}>{name}{teamOf(name) ? ` — ${teamOf(name)}` : ""}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {showNote ? (
              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Note (optional)</Text>
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">{note.length}/{NOTE_LIMIT}</Text>
                </div>
                <textarea
                  value={note}
                  rows={2}
                  onChange={(event) => setNote(event.target.value.slice(0, NOTE_LIMIT))}
                  placeholder="Context for whoever picks this up next"
                  className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                />
              </label>
            ) : null}

            {error ? <Text as="p" role="alert" className="text-[13px] text-ui-fg-error">{error}</Text> : null}
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-ui-border-base p-4">
        {showingRecorded ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="base" onClick={() => setEditing(true)}>{isClosed ? "Correct record" : "Edit decision"}</Button>
            {!isClosed ? (
              <Button variant="secondary" size="base" onClick={() => onSave({ ...decision!, confirmedAt: stamp() })}>
                {confirmationLabel[decision!.action]}
              </Button>
            ) : null}
            <Button variant="primary" size="base" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <Button variant="primary" size="base" className="w-full justify-center" onClick={record}>
              {isFinal ? "Save changes" : "Record decision"}
            </Button>
            <div className="flex items-center justify-between gap-2">
              {isFinal ? (
                <button type="button" onClick={() => { setEditing(false); setError(null); }} className="text-[13px] font-medium text-ui-fg-subtle hover:underline">Cancel edit</button>
              ) : (
                <button type="button" onClick={() => { onClose(); onReassign(); }} className="text-[13px] font-medium text-ui-fg-subtle hover:underline">
                  Not your decision? Reassign
                </button>
              )}
              {!showNote ? (
                <button type="button" onClick={() => setShowNote(true)} className="text-[13px] font-medium text-ui-fg-subtle hover:underline">Add a note</button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
