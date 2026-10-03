"use client";

import Image from "next/image";
import Link from "next/link";
import { Text, clx } from "@medusajs/ui";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { people } from "@/config/people";
import { actionLabel, type DecisionAction, type RenewalDetail } from "@/features/renewal-detail";
import { renewals, useAssessedRenewals, windowHeadline } from "@/features/renewal-risk";
import { validateToken } from "@/features/renewal-risk/escalation";
import { followUpTasksFor } from "@/features/renewal-risk/follow-up";
import { isDecisionClosed, useRenewalRuntime, type DecisionRecord } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

type OwnerAction = DecisionAction | "Not mine";

const actionCopy: Record<OwnerAction, string> = {
  Renew: "Keep it as-is — renew on the current terms.",
  Renegotiate: "Renew only if the price or terms improve.",
  "Right-size": "Renew, but adjust the seat count first.",
  Cancel: "Let it lapse — cancel before the notice deadline.",
  Escalate: "I can't decide — hand it to the finance lead.",
  "Not mine": "I don't own this — someone else does.",
};

// Frame 8b — once the cancel-by date has passed, "cancel before the
// deadline" isn't a real option anymore. Swap the label and copy for the
// three paths that actually apply to a missed window; "Not mine" is
// deadline-independent, so it's left out and falls back to the normal copy.
const recoveryLabel: Partial<Record<OwnerAction, string>> = {
  Renegotiate: "Negotiate terms",
  "Right-size": "Negotiate downsize",
  Cancel: "Request goodwill cancellation",
  Renew: "Accept current renewal",
};
const recoveryActionCopy: Partial<Record<OwnerAction, string>> = {
  Renew: "Keep the current terms and confirm the outcome later.",
  Renegotiate: "Ask for better terms now that the window's closed.",
  "Right-size": "Ask for a smaller plan now that the window's closed.",
  Cancel: "Ask the vendor to cancel anyway — not guaranteed, but worth asking.",
};

function displayLabel(action: OwnerAction | null | undefined, isPastCancelBy: boolean): string {
  if (!action) return "";
  if (action === "Not mine") return "Not mine";
  if (!isPastCancelBy) return actionLabel(action);
  return recoveryLabel[action] ?? actionLabel(action);
}

// Owner submissions record a decision. Vendor and finance follow-through
// remains pending until an outcome is confirmed in Trellis.
const postSubmitCopy: Partial<Record<DecisionAction, string>> = {
  Renew: "Decision recorded. Confirm the renewal outcome in Trellis when the terms are known.",
  Renegotiate: "Decision recorded. Negotiate with the vendor and confirm the new terms before closing this risk.",
  "Right-size": "Decision recorded. Negotiate with the vendor and confirm the new terms before closing this risk.",
  Cancel: "Decision recorded. Contact the vendor; cancellation is pending their confirmation.",
  Escalate: "Handed to the finance lead. They still need to make the final call.",
};

export function OwnerDecisionView({
  detail,
  presetAction,
  token,
}: {
  detail: RenewalDetail;
  presetAction?: OwnerAction;
  /** The signed link credential from a reminder. Required while Renewal Decisions is on. */
  token?: string;
}) {
  const slug = toVendorSlug(detail.vendor);
  const { ready, resolutions, confirmDecision, assignOwner, assignDecider, flags, outbox, acknowledge, markTokenUsed, today } = useRenewalRuntime();
  const decisionsOn = flags.renewalDecisions;
  const resolution = resolutions[slug];
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const isPastCancelBy = (row?.daysToCancelBy ?? 0) < 0;

  const [action, setAction] = useState<OwnerAction | null>(presetAction ?? null);
  const [seats, setSeats] = useState("");
  const [reassignTo, setReassignTo] = useState<string>(people[0]?.name ?? "");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const renewalDate = detail.timeline.find((point) => point.label === "Renewal date")?.date;
  const yoy = detail.contactDetails.find((row_) => row_.label === "YoY price change")?.value;

  const alreadyResolved = !submitted && !!resolution?.decision && !resolution.decision.draft;

  // One-click links are credentials: with Renewal Decisions on, only a link that
  // was actually issued for this contract, and not yet used, may record anything.
  const access = decisionsOn ? validateToken(token, slug, outbox) : null;
  const linkEntry = access?.status === "valid" ? access.entry : null;
  const acked = useRef(false);
  useEffect(() => {
    // Opening a valid link counts as seeing the reminder.
    if (ready && linkEntry && !acked.current) {
      acked.current = true;
      acknowledge(slug, linkEntry.step);
    }
  }, [ready, linkEntry, acknowledge, slug]);

  const submit = () => {
    if (!action || !row) return;
    if (decisionsOn && !linkEntry) return;
    if (action === "Not mine") {
      if (decisionsOn) assignDecider(slug, reassignTo);
      else assignOwner(slug, reassignTo);
    } else {
      const actor = linkEntry?.recipient ?? row.owner ?? undefined;
      confirmDecision(slug, {
        action,
        note: note.trim(),
        ownerName: actor,
        decidedBy: decisionsOn ? actor : undefined,
        cycle: decisionsOn ? row.renewalDate : undefined,
        termsSnapshot: decisionsOn ? row.termsSnapshot : undefined,
        tasks: decisionsOn ? followUpTasksFor(action, row, today) : undefined,
        targetOutcome: action === "Right-size" ? `Reduce to ${seats} seats` : undefined,
      });
    }
    if (token && linkEntry) markTokenUsed(token);
    setSubmitted(true);
  };

  if (decisionsOn && !submitted) {
    if (!ready) return null;
    if (access && access.status !== "valid") {
      const reason: Record<string, string> = {
        missing: "This page needs the link from a Trellis reminder. Opening it directly doesn't identify who you are.",
        forged: "This link has been altered, so it can't be trusted.",
        unknown: "Trellis has no record of sending this link.",
        "wrong-contract": "This link was issued for a different renewal.",
        used: "This link has already been used to record a response. Open the renewal in Trellis to review or change it.",
      };
      return (
        <div className="flex w-full max-w-[480px] flex-col gap-4">
          <Alert tone="warning" title="This link can't be used" description={reason[access.status]} />
          <Link href={`/renewals/${slug}`} className="text-[14px] font-medium text-ui-fg-interactive hover:underline">
            Open this renewal in Trellis →
          </Link>
        </div>
      );
    }
  }

  if (submitted || alreadyResolved) {
    const recordedAction = submitted ? action : resolution?.decision?.action;
    const recordedDecision: DecisionRecord | undefined = submitted
      ? action && action !== "Not mine"
        ? {
            action,
            note: note.trim(),
            ownerName: row?.owner ?? undefined,
            targetOutcome: action === "Right-size" ? `Reduce to ${seats} seats` : undefined,
            draft: false,
          }
        : undefined
      : resolution?.decision;
    const closed = recordedDecision ? isDecisionClosed(recordedDecision) : false;
    return (
      <div className="flex w-full max-w-[480px] flex-col gap-4">
        <Alert
          tone={
            recordedAction === "Not mine" || closed
              ? "success"
              : recordedAction === "Escalate"
                ? "danger"
                : "warning"
          }
          title={
            recordedAction === "Not mine"
              ? "Thanks — we've reassigned it."
              : `Recorded: ${displayLabel(recordedAction, isPastCancelBy)}${closed ? "" : " — pending"}`
          }
          description={
            recordedAction === "Not mine"
              ? `${reassignTo} is now assigned to ${detail.vendor} in Trellis. No email has been sent.`
              : closed
                ? "The outcome was marked confirmed in Trellis."
                : (postSubmitCopy[recordedAction as DecisionAction] ?? "Decision recorded in Trellis. Follow-up is still required.")
          }
        />
        <Link href={`/renewals/${slug}`} className="text-[14px] font-medium text-ui-fg-interactive hover:underline">
          Open this renewal in Trellis →
        </Link>
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-5">
      <div className="flex items-center gap-3">
        <Image src={detail.logo} alt="" width={40} height={40} className="size-10 rounded-[8px] object-cover" />
        <div className="flex flex-col">
          <Text as="span" className="text-[16px] font-medium leading-6 text-ui-fg-base">
            {detail.vendor}
          </Text>
          <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">
            {detail.subtitle}
          </Text>
        </div>
      </div>

      <Text as="p" className="text-[14px] leading-6 text-ui-fg-base">
        <span className="font-medium">{detail.vendor}</span> renews {renewalDate ?? "soon"} for{" "}
        <span className="font-medium">{row.contractAmount}</span>. You must cancel by{" "}
        <span className="font-medium">{row.cancelBy}</span> ({windowHeadline(row.daysToCancelBy).toLowerCase()}).{" "}
        {decisionsOn ? <>Please decide by <span className="font-medium">{row.decideBy}</span>. </> : null}
        {detail.plan.activeSeats} of {detail.plan.purchasedSeats} seats active ({detail.plan.usagePercent}%)
        {yoy ? `, price ${yoy} YoY` : ""}.
      </Text>

      {isPastCancelBy ? (
        <Text as="p" className="text-[12px] font-medium uppercase tracking-wide text-ui-fg-error">
          Cancel-by already passed — here&apos;s what&apos;s actually still open
        </Text>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {(["Renew", "Renegotiate", "Right-size", "Cancel", "Escalate", "Not mine"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAction(option)}
            className={clx(
              "flex flex-col items-start gap-0.5 rounded-[8px] border px-3 py-2 text-left transition-colors",
              action === option
                ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
                : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle",
            )}
          >
            <Text
              as="span"
              className={clx(
                "text-[14px] font-medium leading-5",
                action === option ? "text-ui-fg-interactive" : "text-ui-fg-base",
              )}
            >
              {displayLabel(option, isPastCancelBy)}
            </Text>
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
              {isPastCancelBy ? (recoveryActionCopy[option] ?? actionCopy[option]) : actionCopy[option]}
            </Text>
          </button>
        ))}
      </div>

      {action === "Right-size" ? (
        <label className="flex flex-col gap-1">
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            How many seats do you actually need?
          </Text>
          <input
            type="number"
            min={0}
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            placeholder={`Currently ${detail.plan.purchasedSeats} purchased`}
            className="h-9 w-full rounded-[8px] border border-ui-border-base bg-ui-bg-base px-3 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </label>
      ) : null}

      {action === "Not mine" ? (
        <label className="flex flex-col gap-1">
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            Who actually owns this?
          </Text>
          <select
            value={reassignTo}
            onChange={(event) => setReassignTo(event.target.value)}
            className="h-9 w-full rounded-[8px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
          >
            {people.map((person) => (
              <option key={person.name} value={person.name}>
                {person.name} · {person.team}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {action && action !== "Not mine" ? (
        <label className="flex flex-col gap-1">
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            Add a note (optional)
          </Text>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder={
              action === "Right-size"
                ? `Right-sizing to ${seats || "…"} seats`
                : action === "Cancel"
                  ? "Why this is being cancelled"
                  : "Context for finance"
            }
            className="w-full resize-none rounded-[8px] border border-ui-border-base bg-ui-bg-base px-3 py-2 text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </label>
      ) : null}

      <Button variant="primary" size="base" disabled={!action || (action === "Right-size" && (!Number.isInteger(Number(seats)) || Number(seats) < 1 || Number(seats) >= detail.plan.purchasedSeats))} onClick={submit} className="w-full justify-center">
        {action === "Not mine" ? "Reassign" : "Record decision"}
      </Button>

      <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">
        This records your response in Trellis. Contact finance directly if their review is needed.
      </Text>
    </div>
  );
}
