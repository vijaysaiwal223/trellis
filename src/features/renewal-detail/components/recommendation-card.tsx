"use client";

import { Avatar, DatePicker, Text } from "@medusajs/ui";
import {
  RiArrowDownLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiExchangeLine,
  RiTimeLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { teamOf } from "@/config/people";
import { addDays, type ISODate } from "@/features/renewal-risk/deadlines";
import type { TermsSnapshot } from "@/features/renewal-risk/decision-model";
import { stamp } from "@/lib/clock";
import { isDecisionClosed, useRenewalConfig, type DecisionEvent, type DecisionRecord } from "@/lib/renewal-runtime-state";

import { actionLabel, type DecisionAction, type RenewalDetail } from "../types";

const NOTE_LIMIT = 500;

const renewalStatusOptions: Record<DecisionAction, string[]> = {
  Renew: ["Not started", "Awaiting renewal confirmation"],
  Renegotiate: ["Not started", "In negotiation", "Pending approval"],
  "Right-size": ["Not started", "In negotiation", "Pending approval"],
  Cancel: ["Not started", "Waiting for vendor"],
  Escalate: ["Not started", "Waiting for finance"],
};

const decisionDetailsCopy: Record<DecisionAction, {
  guidance: string;
  targetLabel: string;
  targetPlaceholder: string;
  followUpLabel: string;
}> = {
  Renew: {
    guidance: "Record the terms you are accepting and when you will confirm the renewal.",
    targetLabel: "Terms to accept (optional)",
    targetPlaceholder: "e.g. Keep 420 seats at current terms",
    followUpLabel: "Confirm renewal by",
  },
  Renegotiate: {
    guidance: "Say which terms you want to change (price, term, notice) and track the vendor conversation.",
    targetLabel: "Terms to negotiate (required)",
    targetPlaceholder: "e.g. Hold price flat and cut the notice period to 30 days",
    followUpLabel: "Follow up on negotiation by",
  },
  "Right-size": {
    guidance: "Define the smaller plan you want, then track the vendor negotiation.",
    targetLabel: "Desired contract change (required)",
    targetPlaceholder: "e.g. Reduce 420 seats toward 269 active seats",
    followUpLabel: "Follow up on negotiation by",
  },
  Cancel: {
    guidance: "Track the cancellation request and wait for written vendor confirmation.",
    targetLabel: "Cancellation request (optional)",
    targetPlaceholder: "e.g. Request written cancellation confirmation",
    followUpLabel: "Follow up with vendor by",
  },
  Escalate: {
    guidance: "State what finance needs to decide and when to follow up.",
    targetLabel: "Decision needed from finance (optional)",
    targetPlaceholder: "e.g. Approve a revised renewal budget",
    followUpLabel: "Follow up with finance by",
  },
};

function dateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateOnly(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return dateOnly(date) === value ? date : null;
}

type DecisionOption = {
  action: DecisionAction;
  label: string;
  description: string;
  icon: RemixiconComponentType;
  iconClassName: string;
};

const decisionOptions: DecisionOption[] = [
  { action: "Renew", label: "Renew at current terms", description: "Keep the existing contract terms", icon: RiCheckboxCircleLine, iconClassName: "text-ui-tag-green-icon" },
  { action: "Renegotiate", label: "Renegotiate", description: "Change price or terms", icon: RiExchangeLine, iconClassName: "text-ui-fg-interactive" },
  { action: "Right-size", label: "Downsize", description: "Renew with fewer seats", icon: RiArrowDownLine, iconClassName: "text-ui-tag-orange-icon" },
  { action: "Cancel", label: "Cancel", description: "Do not renew", icon: RiCloseCircleLine, iconClassName: "text-ui-fg-error" },
];

// A hand-off, not an outcome: someone who cannot decide passes it to the finance lead.
const escalateOption: DecisionOption = {
  action: "Escalate", label: "Needs review", description: "Hand off to the finance lead", icon: RiTimeLine, iconClassName: "text-ui-fg-muted",
};

// Frame 8b — once cancel-by has passed, "Cancel as planned" and "renew as
// planned" aren't real options anymore (the window to do either cleanly is
// gone), so swap in the three paths that actually apply to a missed window.
// Each still maps to an existing DecisionAction so closure/exposure logic
// (isDecisionClosed) doesn't need special-casing for the recovery path.
const recoveryOptions: DecisionOption[] = [
  {
    action: "Renegotiate",
    label: "Negotiate terms",
    description: "Ask for better terms now that the window's closed",
    icon: RiExchangeLine,
    iconClassName: "text-ui-fg-interactive",
  },
  {
    action: "Right-size",
    label: "Negotiate downsize",
    description: "Ask for a smaller plan now that the window's closed",
    icon: RiArrowDownLine,
    iconClassName: "text-ui-tag-orange-icon",
  },
  {
    action: "Cancel",
    label: "Request goodwill cancellation",
    description: "Ask the vendor to cancel anyway, past notice",
    icon: RiCloseCircleLine,
    iconClassName: "text-ui-fg-error",
  },
  {
    action: "Renew",
    label: "Accept current renewal",
    description: "Keep the current terms; confirm the outcome later",
    icon: RiCheckboxCircleLine,
    iconClassName: "text-ui-tag-green-icon",
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
  history: DecisionEvent[];
  ownerOptions: string[];
  currentOwnerName?: string;
  onSave: (decision: DecisionRecord) => void;
  onClose: () => void;
  isPastCancelBy?: boolean;
  daysToCancelBy?: number;
  /** Decide-by label, shown with the evidence. */
  decideBy?: string;
  /** Stamped onto the record so a later change to the terms or cycle can re-open it. */
  recordContext?: { cycle: ISODate; termsSnapshot: TermsSnapshot };
  suggestedAction?: DecisionAction;
  suggestedReasoning?: string;
};

export function RecommendationCard({
  detail,
  decision,
  history,
  ownerOptions,
  currentOwnerName,
  onSave,
  onClose,
  isPastCancelBy,
  daysToCancelBy,
  decideBy,
  recordContext,
  suggestedAction,
  suggestedReasoning,
}: RecommendationCardProps) {
  const { today } = useRenewalConfig();
  const isFinal = !!decision && !decision.draft;
  const isClosed = isFinal && isDecisionClosed(decision!);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [errors, setErrors] = useState<{ action?: string; owner?: string; targetOutcome?: string; followUpBy?: string }>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  // Which set of options is showing right now — used both to render the
  // picker and to look up the right label for an already-recorded decision.
  const options = isPastCancelBy ? recoveryOptions : decisionOptions;
  const allOptions = [...options, escalateOption];
  const pendingFollowUp: Partial<Record<DecisionAction, string>> = {
    Renew: "Still pending: confirm the renewal outcome before closing this risk.",
    Cancel: isPastCancelBy
      ? "Still pending: the vendor has to agree to this — notice has already passed, so it's goodwill, not a guarantee."
      : "Still pending: confirm the cancellation with the vendor before the cancel-by date.",
    Renegotiate: "Still pending: agree on new terms with the vendor, then mark the outcome confirmed.",
    "Right-size": "Still pending: agree on the smaller plan with the vendor, then mark the outcome confirmed.",
    Escalate: "Still pending: finance needs to make the final call. Edit this record when a final decision is made.",
  };
  const confirmationLabel: Partial<Record<DecisionAction, string>> = {
    Renew: "Mark renewal confirmed",
    Renegotiate: "Mark new terms confirmed",
    "Right-size": "Mark new terms confirmed",
    Cancel: "Mark vendor cancellation confirmed",
  };

  const [action, setAction] = useState<DecisionAction | null>(decision?.action ?? null);
  const [targetOutcomes, setTargetOutcomes] = useState<Partial<Record<DecisionAction, string>>>(
    decision ? { [decision.action]: decision.targetOutcome ?? "" } : {},
  );
  const [renewalStatus, setRenewalStatus] = useState(
    decision?.renewalStatus && renewalStatusOptions[decision.action].includes(decision.renewalStatus)
      ? decision.renewalStatus
      : "Not started",
  );
  const [note, setNote] = useState(decision?.note ?? "");
  const [noteEdited, setNoteEdited] = useState(false);
  const [followUpBy, setFollowUpBy] = useState<Date | null>(fromDateOnly(decision?.followUpBy));
  const [owner, setOwner] = useState(decision?.ownerName ?? currentOwnerName ?? "");
  const eligibleOwners = currentOwnerName && !ownerOptions.includes(currentOwnerName)
    ? [currentOwnerName, ...ownerOptions]
    : ownerOptions;

  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    if (showDiscard) dialogRef.current?.querySelector<HTMLButtonElement>('[data-keep-editing]')?.focus();
  }, [showDiscard]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (showDiscard) setShowDiscard(false);
        else if (dirty) setShowDiscard(true);
        else onClose();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const scope = dialogRef.current.querySelector<HTMLElement>('[role="alertdialog"]') ?? dialogRef.current;
      const focusable = Array.from(scope.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === dialogRef.current) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dirty, onClose, showDiscard]);

  const requestClose = () => dirty ? setShowDiscard(true) : onClose();
  const cancelEdit = () => {
    if (!decision) return;
    setAction(decision.action);
    setOwner(decision.ownerName ?? currentOwnerName ?? "");
    setTargetOutcomes({ [decision.action]: decision.targetOutcome ?? "" });
    setRenewalStatus(decision.renewalStatus ?? "Not started");
    setNote(decision.note);
    setNoteEdited(false);
    setFollowUpBy(fromDateOnly(decision.followUpBy));
    setErrors({});
    setDirty(false);
    setEditing(false);
  };

  // Derived defaults can arrive while the modal is open without replacing edits.
  const selectedAction = action;
  const targetOutcome = selectedAction ? targetOutcomes[selectedAction] ?? "" : "";
  const detailsCopy = selectedAction ? decisionDetailsCopy[selectedAction] : null;
  const displayedNote = !decision && !noteEdited && suggestedReasoning
    ? suggestedReasoning.slice(0, NOTE_LIMIT)
    : note;

  const annualContract = detail.contactDetails.find((row) => row.label === "Annual contract")?.value;
  const yoyChange = detail.contactDetails.find((row) => row.label === "YoY price change")?.value;
  const cancelBy = detail.timeline.find((point) => point.label === "Cancel-by")?.date;
  const renewalType = detail.contactDetails.find((row) => row.label === "Renewal type")?.value;

  const buildRecord = (draft: boolean): DecisionRecord => ({
    action: selectedAction ?? "Renew",
    note: displayedNote.trim(),
    ownerName: owner || undefined,
    decidedBy: owner || undefined,
    cycle: recordContext?.cycle ?? decision?.cycle,
    termsSnapshot: recordContext?.termsSnapshot ?? decision?.termsSnapshot,
    targetOutcome: targetOutcome.trim() || undefined,
    renewalStatus,
    followUpBy: followUpBy ? dateOnly(followUpBy) : undefined,
    recordedAt: decision?.recordedAt,
    draft,
  });

  const recordDecision = () => {
    const lastSafeFollowUp = addDays(today, daysToCancelBy ?? 0);
    const nextErrors = {
      action: !selectedAction ? "Choose a decision before recording it." : undefined,
      owner: !owner || !eligibleOwners.includes(owner) ? "Choose an active decider." : undefined,
      targetOutcome: (selectedAction === "Right-size" || selectedAction === "Renegotiate") && !targetOutcome.trim()
        ? "Describe the terms you want to negotiate." : undefined,
      followUpBy: !followUpBy ? "Set a follow-up date for this pending decision."
        : dateOnly(followUpBy) < today ? "Choose today or a future date."
          : !isPastCancelBy && daysToCancelBy !== undefined && dateOnly(followUpBy) > lastSafeFollowUp
            ? `Follow up no later than cancel-by (${cancelBy ?? lastSafeFollowUp}).` : undefined,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    onSave(buildRecord(false));
    onClose();
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="renewal-decision-title" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout outline-none">
      <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={detail.logo}
            fallback={detail.vendor.slice(0, 2).toUpperCase()}
            variant="squared"
            size="base"
          />
          <div className="flex flex-col">
            <Text as="span" id="renewal-decision-title" className="text-[16px] font-medium leading-6 text-ui-fg-base">
              {isFinal && !editing ? "Renewal decision" : "Record renewal decision"}
            </Text>
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
              {detail.vendor} · {detail.subtitle}
            </Text>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={requestClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
        {isFinal && !editing ? (
          <>
            <Alert tone={isClosed ? "success" : decision!.action === "Escalate" ? "danger" : "warning"}>
              <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                {isClosed ? "Outcome confirmed" : "Decision recorded — awaiting outcome"} —{" "}
                {allOptions.find((o) => o.action === decision!.action)?.label ?? actionLabel(decision!.action)}
              </Text>
              <Text as="span" className="text-[12px] leading-4 text-ui-fg-base">
                {isClosed ? "A team member marked the outcome confirmed in Trellis." : pendingFollowUp[decision!.action]}
              </Text>
            </Alert>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3 text-[13px]">
              <Stat label="Decided by" value={decision!.decidedBy ?? decision!.ownerName ?? "Unassigned"} />
              <Stat label="Progress" value={isClosed ? "Confirmed" : decision!.renewalStatus ?? "Not started"} />
              {decision!.targetOutcome ? <Stat label="Target outcome" value={decision!.targetOutcome} /> : null}
              {decision!.followUpBy ? <Stat label="Follow up by" value={decision!.followUpBy} /> : null}
              {decision!.recordedAt ? <Stat label="Recorded" value={new Date(decision!.recordedAt).toLocaleString()} /> : null}
              {decision!.confirmedAt ? <Stat label="Confirmed" value={new Date(decision!.confirmedAt).toLocaleString()} /> : null}
            </div>
            {decision!.note ? (
              <Text as="p" className="text-[13px] leading-5 text-ui-fg-subtle">{decision!.note}</Text>
            ) : null}
            {history.length > 0 ? (
              <div className="border-t border-ui-border-base pt-3">
                <Text as="p" className="text-[12px] font-medium text-ui-fg-base">Decision activity in this browser</Text>
                <ul className="mt-2 space-y-1 text-[12px] text-ui-fg-subtle">
                  {history.slice(-4).reverse().map((event, index) => (
                    <li key={`${event.at}-${index}`}>{event.label} · {new Date(event.at).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="base" onClick={() => setEditing(true)}>{isClosed ? "Correct record" : "Edit decision"}</Button>
              {!isClosed && confirmationLabel[decision!.action] ? (
                <Button variant="primary" size="base" onClick={() => {
                  onSave({ ...decision!, confirmedAt: stamp() });
                  onClose();
                }}>
                  {confirmationLabel[decision!.action]}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {decision?.draft ? (
              <Alert tone="info">
                <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
                  Continuing from a saved draft.
                </Text>
              </Alert>
            ) : null}
            {editing && isClosed ? (
              <Alert tone="warning" title="Correcting a confirmed outcome" description="Saving changes will return this renewal to pending until the outcome is confirmed again." />
            ) : null}

            <div>
              <Text as="span" className="mb-2 block text-[14px] font-medium leading-5 text-ui-fg-base">
                Evidence summary
              </Text>
              <div className="grid w-full grid-cols-2 gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3 sm:grid-cols-4">
                {annualContract ? <Stat label="Contract" value={annualContract} /> : null}
                <Stat label="Seat usage" value={`${detail.plan.usagePercent}%`} />
                {yoyChange ? (
                  <Stat label="YoY price change" value={yoyChange} valueClassName="text-[14px] font-medium leading-5 text-ui-tag-orange-text" />
                ) : null}
                <Stat label="Possible waste" value={detail.plan.possibleWaste} />
                {decideBy ? <Stat label="Decide by" value={decideBy} /> : null}
                {cancelBy ? <Stat label="Cancel-by" value={cancelBy} /> : null}
                {renewalType ? <Stat label="Renewal type" value={renewalType} /> : null}
                <Stat label="Decider" value={currentOwnerName ?? "Unassigned"} />
              </div>
            </div>

            <div>
              <Text as="span" className="mb-2 block text-[14px] font-medium leading-5 text-ui-fg-base">
                Select decision
              </Text>
              {isPastCancelBy ? (
                <Text as="span" className="mb-2 block text-[12px] font-medium leading-4 text-ui-fg-error">
                  {cancelBy ? `Cancel-by was ${cancelBy}. ` : "Cancel-by has passed. "}Vendor agreement may be needed for changes or cancellation.
                </Text>
              ) : null}
              <div role="group" aria-label="Renewal decision" className={`grid w-full grid-cols-2 gap-2 ${isPastCancelBy ? "sm:grid-cols-4" : "sm:grid-cols-4"}`}>
                {options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedAction === option.action;
                  return (
                    <button
                      key={option.action}
                      type="button"
                      onClick={() => {
                        setAction(option.action);
                        setRenewalStatus("Not started");
                        setDirty(true);
                        setErrors((previous) => ({ ...previous, action: undefined }));
                      }}
                      aria-pressed={isSelected}
                      className={
                        "flex flex-col items-start gap-1.5 rounded-[8px] border px-3 py-2.5 text-left transition-colors " +
                        (isSelected
                          ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
                          : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle")
                      }
                    >
                      <Icon className={`size-5 ${option.iconClassName}`} />
                      <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                        {option.label}
                      </Text>
                      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                        {option.description}
                      </Text>
                      {!decision && suggestedAction === option.action ? (
                        <Text as="span" className="text-[11px] font-medium text-ui-fg-interactive">Bruno suggests</Text>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-pressed={selectedAction === "Escalate"}
                onClick={() => {
                  setAction("Escalate");
                  setRenewalStatus("Not started");
                  setDirty(true);
                  setErrors((previous) => ({ ...previous, action: undefined }));
                }}
                className={
                  "mt-2 flex w-full items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-[13px] transition-colors " +
                  (selectedAction === "Escalate"
                    ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
                    : "border-dashed border-ui-border-strong bg-ui-bg-base hover:bg-ui-bg-subtle")
                }
              >
                <RiTimeLine className="size-4 text-ui-fg-muted" />
                <span className="font-medium text-ui-fg-base">Can&apos;t decide?</span>
                <span className="text-ui-fg-subtle">Hand it to the finance lead. This is a hand-off, not an outcome.</span>
              </button>
              {errors.action ? <Text as="p" role="alert" className="mt-2 text-[12px] text-ui-fg-error">{errors.action}</Text> : null}
            </div>

            {selectedAction ? <div className="flex flex-col gap-3 rounded-xl border border-ui-border-base p-3">
              <div>
                <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                  Decision details
                </Text>
                <Text as="p" className="mt-0.5 text-[12px] leading-4 text-ui-fg-subtle">
                  {detailsCopy?.guidance}
                </Text>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    Decider (required)
                  </Text>
                  <select
                    value={eligibleOwners.includes(owner) ? owner : ""}
                    onChange={(event) => {
                      setOwner(event.target.value);
                      setDirty(true);
                      setErrors((previous) => ({ ...previous, owner: undefined }));
                    }}
                    aria-invalid={Boolean(errors.owner)}
                    className="h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                  >
                    <option value="" disabled>Select an active decider</option>
                    {eligibleOwners.map((name) => (
                      <option key={name} value={name}>
                        {name}
                        {teamOf(name) ? ` — ${teamOf(name)}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.owner ? <Text as="span" role="alert" className="text-[12px] text-ui-fg-error">{errors.owner}</Text> : null}
                </label>

                <label className="flex flex-col gap-1">
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    {detailsCopy?.targetLabel}
                  </Text>
                  <input
                    type="text"
                    value={targetOutcome}
                    onChange={(event) => {
                      setTargetOutcomes((previous) => ({ ...previous, [selectedAction]: event.target.value }));
                      setDirty(true);
                      setErrors((previous) => ({ ...previous, targetOutcome: undefined }));
                    }}
                    aria-invalid={Boolean(errors.targetOutcome)}
                    placeholder={detailsCopy?.targetPlaceholder}
                    className="h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                  />
                  {errors.targetOutcome ? <Text as="span" role="alert" className="text-[12px] text-ui-fg-error">{errors.targetOutcome}</Text> : null}
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                    Progress
                </Text>
                <select
                  value={renewalStatus}
                  onChange={(event) => {
                    setRenewalStatus(event.target.value);
                    setDirty(true);
                  }}
                  className="h-9 w-full max-w-[200px] rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                >
                  {renewalStatusOptions[selectedAction ?? "Renew"].map((status) => (
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
                    {displayedNote.length}/{NOTE_LIMIT}
                  </Text>
                </div>
                <textarea
                  value={displayedNote}
                  onChange={(event) => {
                    setNoteEdited(true);
                    setNote(event.target.value.slice(0, NOTE_LIMIT));
                    setDirty(true);
                  }}
                  rows={3}
                  placeholder="Add context for whoever picks this up next"
                  className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                />
                {!decision && !noteEdited && suggestedReasoning ? (
                  <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Bruno drafted this context. Review it before recording.</Text>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                  <span id="decision-follow-up-label">{detailsCopy?.followUpLabel} (required)</span>
                </Text>
                <DatePicker
                  value={followUpBy}
                  onChange={(date) => {
                    setFollowUpBy(date);
                    setDirty(true);
                    setErrors((previous) => ({ ...previous, followUpBy: undefined }));
                  }}
                  size="small"
                  className="max-w-[200px]"
                  aria-labelledby="decision-follow-up-label"
                />
                {errors.followUpBy ? <Text as="span" role="alert" className="text-[12px] text-ui-fg-error">{errors.followUpBy}</Text> : null}
                <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">Demo timeline as of {today}. Reminders are simulated in this prototype, not delivered.</Text>
              </label>
            </div> : (
              <Text as="p" className="text-[13px] leading-5 text-ui-fg-subtle">Choose a decision to complete its details.</Text>
            )}

          </>
        )}
      </div>
      {(!isFinal || editing) ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-ui-border-base p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isFinal ? (
            <Button variant="secondary" size="base" className="flex-1" onClick={cancelEdit}>Cancel edit</Button>
          ) : (
            <Button variant="secondary" size="base" className="flex-1" disabled={!selectedAction} onClick={() => {
              onSave(buildRecord(true));
              onClose();
            }}>Save draft</Button>
          )}
          <Button variant="primary" size="base" className="flex-1" onClick={recordDecision}>
            {isFinal ? "Save decision changes" : "Record decision"}
          </Button>
          </div>
          <Text as="p" className="text-center text-[11px] leading-4 text-ui-fg-muted">Saved in this browser only. No vendor or finance message is sent.</Text>
        </div>
      ) : null}
      {showDiscard ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ui-fg-base/30 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-description" className="w-full max-w-[340px] rounded-xl border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-flyout">
            <Text as="p" id="discard-title" className="text-[16px] font-semibold text-ui-fg-base">Discard changes?</Text>
            <Text as="p" id="discard-description" className="mt-1 text-[13px] leading-5 text-ui-fg-subtle">Your changes to this decision have not been saved.</Text>
            <div className="mt-4 flex justify-end gap-2">
              <Button data-keep-editing variant="secondary" size="base" onClick={() => setShowDiscard(false)}>Keep editing</Button>
              <Button variant="primary" size="base" onClick={onClose}>Discard changes</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
