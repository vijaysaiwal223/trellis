"use client";

import { Avatar, DatePicker, Text } from "@medusajs/ui";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { teamOf } from "@/config/people";
import { isDecisionClosed, type DecisionRecord } from "@/lib/renewal-runtime-state";

import type { DecisionAction, RenewalDetail } from "../types";

const NOTE_LIMIT = 500;

const renewalStatusOptions = ["Not started", "In negotiation", "Pending approval", "Finalized"] as const;

function KeepIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-ui-tag-green-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="m6.8 10 2.2 2.2 4.2-4.4" />
    </svg>
  );
}

function RenegotiateIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-ui-fg-interactive" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h9.5l-2-2M16 13H6.5l2 2" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-ui-fg-error" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="m7.3 7.3 5.4 5.4M12.7 7.3l-5.4 5.4" />
    </svg>
  );
}

function NeedsReviewIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-ui-fg-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l2.6 1.6" />
    </svg>
  );
}

type DecisionOption = {
  action: DecisionAction;
  label: string;
  description: string;
  icon: () => React.ReactElement;
};

const decisionOptions: DecisionOption[] = [
  { action: "Renew", label: "Keep", description: "Renew as planned", icon: KeepIcon },
  { action: "Right-size", label: "Renegotiate", description: "Adjust terms or reduce spend", icon: RenegotiateIcon },
  { action: "Cancel", label: "Cancel", description: "Do not renew", icon: CancelIcon },
  { action: "Escalate", label: "Needs review", description: "More analysis required", icon: NeedsReviewIcon },
];

// Frame 8b — once cancel-by has passed, "Cancel as planned" and "renew as
// planned" aren't real options anymore (the window to do either cleanly is
// gone), so swap in the three paths that actually apply to a missed window.
// Each still maps to an existing DecisionAction so closure/exposure logic
// (isDecisionClosed) doesn't need special-casing for the recovery path.
const recoveryOptions: DecisionOption[] = [
  {
    action: "Right-size",
    label: "Negotiate downsize",
    description: "Ask for a smaller plan now that the window's closed",
    icon: RenegotiateIcon,
  },
  {
    action: "Cancel",
    label: "Request goodwill cancellation",
    description: "Ask the vendor to cancel anyway, past notice",
    icon: CancelIcon,
  },
  {
    action: "Renew",
    label: "Accept & alert next cycle",
    description: "Let it stand, but flag it earlier before the next window",
    icon: KeepIcon,
  },
];

function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
        {label}
      </Text>
      <Text as="span" className={valueClassName ?? "text-[14px] font-medium leading-5 text-ui-fg-base"}>
        {value}
      </Text>
    </div>
  );
}

type RecommendationCardProps = {
  detail: RenewalDetail;
  /** Raw stored decision — may be a draft (prefills the form) or final (shows the recorded state). */
  decision: DecisionRecord | null;
  ownerOptions: string[];
  currentOwnerName?: string;
  onAssignOwner: (name: string) => void;
  onSave: (decision: DecisionRecord) => void;
  onClose: () => void;
  isPastCancelBy?: boolean;
};

export function RecommendationCard({
  detail,
  decision,
  ownerOptions,
  currentOwnerName,
  onAssignOwner,
  onSave,
  onClose,
  isPastCancelBy,
}: RecommendationCardProps) {
  const isFinal = !!decision && !decision.draft;
  const isClosed = isFinal && isDecisionClosed(decision!);
  // Which set of options is showing right now — used both to render the
  // picker and to look up the right label for an already-recorded decision.
  const options = isPastCancelBy ? recoveryOptions : decisionOptions;
  const pendingFollowUp: Partial<Record<DecisionAction, string>> = {
    Cancel: isPastCancelBy
      ? "Still pending: the vendor has to agree to this — notice has already passed, so it's goodwill, not a guarantee."
      : "Still pending: confirm the cancellation with the vendor before the cancel-by date.",
    "Right-size": "Still pending: mark the renewal status Finalized once new terms are confirmed.",
    Escalate: "Still pending: finance needs to make the final call.",
  };

  const [action, setAction] = useState<DecisionAction>(decision?.action ?? "Renew");
  const [targetOutcome, setTargetOutcome] = useState(decision?.targetOutcome ?? "");
  const [renewalStatus, setRenewalStatus] = useState(decision?.renewalStatus ?? renewalStatusOptions[0]);
  const [note, setNote] = useState(decision?.note ?? "");
  const [followUpBy, setFollowUpBy] = useState<Date | null>(
    decision?.followUpBy ? new Date(decision.followUpBy) : null,
  );

  const owner = currentOwnerName ?? ownerOptions[0] ?? "";
  const annualContract = detail.contactDetails.find((row) => row.label === "Annual contract")?.value;
  const yoyChange = detail.contactDetails.find((row) => row.label === "YoY price change")?.value;

  const buildRecord = (draft: boolean): DecisionRecord => ({
    action,
    note: note.trim(),
    targetOutcome: targetOutcome.trim() || undefined,
    renewalStatus,
    followUpBy: followUpBy ? followUpBy.toISOString().slice(0, 10) : undefined,
    draft,
  });

  return (
    <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout">
      <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={detail.logo}
            fallback={detail.vendor.slice(0, 2).toUpperCase()}
            variant="squared"
            size="base"
          />
          <div className="flex flex-col">
            <Text as="span" className="text-[16px] font-medium leading-6 text-ui-fg-base">
              Record renewal decision
            </Text>
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
              {detail.vendor} · {detail.subtitle}
            </Text>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </div>

      <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
        {isFinal ? (
          <Alert tone={isClosed ? "success" : decision!.action === "Escalate" ? "danger" : "warning"}>
            <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
              {isClosed ? "Decision recorded" : "Decision recorded — pending"} —{" "}
              {options.find((o) => o.action === decision!.action)?.label ?? decision!.action}
            </Text>
            {!isClosed ? (
              <Text as="span" className="text-[12px] leading-4 text-ui-fg-base">
                {pendingFollowUp[decision!.action] ?? "Still pending follow-through."}
              </Text>
            ) : null}
            {decision!.note ? (
              <Text as="span" className="text-[12px] leading-4 text-ui-fg-base">
                &ldquo;{decision!.note}&rdquo;
              </Text>
            ) : null}
          </Alert>
        ) : (
          <>
            {decision?.draft ? (
              <Alert tone="info">
                <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
                  Continuing from a saved draft.
                </Text>
              </Alert>
            ) : null}

            <div>
              <Text as="span" className="mb-2 block text-[14px] font-medium leading-5 text-ui-fg-base">
                Evidence summary
              </Text>
              <div className="grid w-full grid-cols-4 gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3">
                {annualContract ? <Stat label="Contract" value={annualContract} /> : null}
                <Stat label="Seat usage" value={`${detail.plan.usagePercent}%`} />
                {yoyChange ? (
                  <Stat label="YoY price change" value={yoyChange} valueClassName="text-[14px] font-medium leading-5 text-ui-tag-orange-text" />
                ) : null}
                <Stat label="Possible waste" value={detail.plan.possibleWaste} />
              </div>
            </div>

            <div>
              <Text as="span" className="mb-2 block text-[14px] font-medium leading-5 text-ui-fg-base">
                Select decision
              </Text>
              {isPastCancelBy ? (
                <Text as="span" className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-ui-fg-error">
                  Cancel-by already passed — here&apos;s what&apos;s actually still open
                </Text>
              ) : null}
              <div className={`grid w-full grid-cols-2 gap-2 ${isPastCancelBy ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
                {options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = action === option.action;
                  return (
                    <button
                      key={option.action}
                      type="button"
                      onClick={() => setAction(option.action)}
                      className={
                        "flex flex-col items-start gap-1.5 rounded-[8px] border px-3 py-2.5 text-left transition-colors " +
                        (isSelected
                          ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
                          : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle")
                      }
                    >
                      <Icon />
                      <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                        {option.label}
                      </Text>
                      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                        {option.description}
                      </Text>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-ui-border-base p-3">
              <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                Decision details
              </Text>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    Decision owner
                  </Text>
                  <select
                    value={owner}
                    onChange={(event) => onAssignOwner(event.target.value)}
                    className="h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                  >
                    {owner && !ownerOptions.includes(owner) ? <option value={owner}>{owner}</option> : null}
                    {ownerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                        {teamOf(name) ? ` — ${teamOf(name)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    Target outcome
                  </Text>
                  <input
                    type="text"
                    value={targetOutcome}
                    onChange={(event) => setTargetOutcome(event.target.value)}
                    placeholder="e.g. Reduce seats to 300"
                    className="h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                  Renewal status
                </Text>
                <select
                  value={renewalStatus}
                  onChange={(event) => setRenewalStatus(event.target.value)}
                  className="h-9 w-full max-w-[200px] rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                >
                  {renewalStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    Internal note
                  </Text>
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">
                    {note.length}/{NOTE_LIMIT}
                  </Text>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, NOTE_LIMIT))}
                  rows={3}
                  placeholder="Add context for whoever picks this up next"
                  className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                />
              </label>

              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                  Follow up by (optional)
                </Text>
                <DatePicker
                  value={followUpBy}
                  onChange={(date) => setFollowUpBy(date)}
                  size="small"
                  className="max-w-[200px]"
                />
              </label>
            </div>

            <div className="flex w-full items-center gap-3">
              <Button
                variant="secondary"
                size="base"
                className="flex-1"
                onClick={() => {
                  onSave(buildRecord(true));
                  onClose();
                }}
              >
                Save draft
              </Button>
              <Button
                variant="primary"
                size="base"
                className="flex-1"
                onClick={() => {
                  onSave(buildRecord(false));
                  onClose();
                }}
              >
                Record decision
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
