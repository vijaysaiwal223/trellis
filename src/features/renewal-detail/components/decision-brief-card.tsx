"use client";

import { Text, clx } from "@medusajs/ui";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { addDays, formatLongISO, isWeekend } from "@/features/renewal-risk/deadlines";
import { ladderFor, stepLabel } from "@/features/renewal-risk/escalation";
import { suggestFromUsage } from "@/features/renewal-risk/follow-up";
import { formatMoney } from "@/features/renewal-risk/money";
import type { Renewal } from "@/features/renewal-risk/types";
import { isDecisionCurrent } from "@/features/renewal-risk/workflow";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { actionLabel } from "../types";

function Fact({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" | "warning" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">{label}</Text>
      <Text as="span" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">{value}</Text>
      {sub ? (
        <Text as="span" className={clx("text-[12px] leading-4", tone === "danger" ? "text-ui-fg-error" : tone === "warning" ? "text-ui-tag-orange-text" : "text-ui-fg-subtle")}>{sub}</Text>
      ) : null}
    </div>
  );
}

const sourceLabel = (row: Renewal, confidence?: number) =>
  row.noticeAssumed
    ? `Assumed — not on file`
    : row.noticeSource === "extracted"
      ? `Extracted from contract${confidence !== undefined ? ` · ${confidence}% sure` : ""}`
      : "Entered manually";

/**
 * Everything the decider needs on one card: the dates that matter and why,
 * where the notice terms came from, who is on the hook, and how the reminder
 * ladder is going.
 */
export function DecisionBriefCard({
  row,
  slug,
  onEditTerms,
  onAssignDecider,
}: {
  row: Renewal;
  slug: string;
  onEditTerms: () => void;
  onAssignDecider: () => void;
}) {
  const { resolutions, outbox, settings, today, acknowledge, snooze, setLeadTimeOverride, recordOutcome, setInactive } = useRenewalRuntime();
  const resolution = resolutions[slug];
  const [leadDraft, setLeadDraft] = useState<string | null>(null);
  const [snoozeError, setSnoozeError] = useState<string | null>(null);

  const decided = Boolean(resolution?.decision && !resolution.decision.draft && isDecisionCurrent(row, resolution));
  const ladder = useMemo(() => ladderFor(row.decideByISO, settings.holidays), [row.decideByISO, settings.holidays]);
  const sentFor = (stepId: string) => outbox.filter((entry) => entry.contractId === slug && entry.step === stepId);
  const unacked = outbox.filter((entry) => entry.contractId === slug && entry.role === "decider" && !entry.ackedAt && !resolution?.acks?.[entry.step]);
  const latestUnacked = unacked[unacked.length - 1];

  const snoozeCount = resolution?.snooze?.count ?? 0;
  const snoozeActive = resolution?.snooze && today <= resolution.snooze.until;
  const snoozeDisabled = decided || snoozeCount >= settings.snoozeLimit || row.daysToDecideBy <= 1;
  const doSnooze = (days: number) => {
    // Never snooze past the day before decide-by.
    const until = addDays(today, days);
    const cap = addDays(row.decideByISO, -1);
    const ok = snooze(slug, until > cap ? cap : until);
    setSnoozeError(ok ? null : `Snooze limit reached (${settings.snoozeLimit}).`);
  };

  const suggestion = suggestFromUsage(row);
  const lastPassed = row.passedRenewals[row.passedRenewals.length - 1];
  const outcomeRecorded = lastPassed ? resolution?.outcomes?.[lastPassed] : undefined;

  const leadValue = leadDraft ?? String(row.leadTimeDays);
  const leadNumber = Number(leadValue);
  const leadValid = Number.isInteger(leadNumber) && leadNumber >= 0 && leadNumber <= 120;

  return (
    <section aria-labelledby="decision-brief-title" className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex items-center justify-between px-3 py-2">
        <Text as="span" id="decision-brief-title" className="text-[14px] font-medium text-ui-fg-base">Decision brief</Text>
        <span className={clx("rounded-full px-2 py-0.5 text-[12px] font-medium", decided ? "bg-ui-tag-green-bg text-ui-tag-green-text" : row.daysToDecideBy < 0 ? "bg-ui-tag-red-bg text-ui-tag-red-text" : "bg-ui-tag-blue-bg text-ui-tag-blue-text")}>
          {decided ? `Decided · ${actionLabel(resolution!.decision!.action)}` : "Undecided"}
        </span>
      </div>

      <div className="flex flex-col gap-4 border-t border-ui-border-base bg-ui-bg-base p-3">
        {row.inactive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2.5">
            <Text as="p" className="text-[13px] text-ui-fg-base">Marked as ended. It is left out of the queue, reminders, digest and metrics.</Text>
            <Button variant="secondary" size="small" onClick={() => setInactive(slug, false)}>Track again</Button>
          </div>
        ) : null}

        {row.termsChanges.length > 0 ? (
          <div role="alert" className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-2.5">
            <Text as="p" className="text-[13px] font-medium text-ui-tag-orange-text">Terms changed — the earlier decision is re-opened</Text>
            <Text as="p" className="text-[12px] leading-4 text-ui-tag-orange-text">{row.termsChanges.join(" · ")}. Review and decide again.</Text>
          </div>
        ) : null}

        {row.noticeAssumed ? (
          <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-2.5">
            <Text as="p" className="text-[13px] font-medium text-ui-tag-orange-text">Notice terms aren&apos;t on file</Text>
            <Text as="p" className="text-[12px] leading-4 text-ui-tag-orange-text">
              Deadlines below assume {row.noticeDays} days&apos; notice — a conservative guess, not the contract. {formatMoney(row.contractValue, row.currency)} depends on it.
            </Text>
            <Button variant="secondary" size="small" className="mt-2" onClick={onEditTerms}>Add notice terms</Button>
          </div>
        ) : null}

        {lastPassed && !outcomeRecorded ? (
          <div role="alert" className="rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-2.5">
            <Text as="p" className="text-[13px] font-medium text-ui-tag-red-text">The {formatLongISO(lastPassed)} renewal date has passed</Text>
            <Text as="p" className="text-[12px] leading-4 text-ui-tag-red-text">
              {resolution?.decision && !resolution.decision.draft && resolution.decision.cycle === lastPassed ? "A decision was on record." : "No decision was recorded for that cycle, so it renewed on silence."} Record what actually happened so the next cycle starts clean.
            </Text>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" size="small" onClick={() => recordOutcome(slug, lastPassed, "auto-renewed")}>It auto-renewed</Button>
              <Button variant="secondary" size="small" onClick={() => recordOutcome(slug, lastPassed, "lapsed")}>It lapsed on purpose</Button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Fact
            label="Decide by"
            value={row.decideBy}
            sub={row.daysToDecideBy < 0 ? `${-row.daysToDecideBy} days overdue` : row.daysToDecideBy === 0 ? "today" : `in ${row.daysToDecideBy} days`}
            tone={row.daysToDecideBy < 0 && !decided ? "danger" : row.daysToDecideBy <= 7 && !decided ? "warning" : undefined}
          />
          <Fact
            label="Cancel-by"
            value={row.cancelBy}
            sub={row.daysToCancelBy < 0 ? `closed ${-row.daysToCancelBy} days ago` : `in ${row.daysToCancelBy} days`}
            tone={row.daysToCancelBy < 0 ? "danger" : undefined}
          />
          <Fact label="Renewal date" value={formatLongISO(row.renewalDate)} sub={row.passedRenewals.length > 0 ? "Next cycle" : undefined} />
          <Fact label="Notice period" value={`${row.noticeDays} days`} sub={sourceLabel(row, resolution?.terms?.confidence)} tone={row.noticeAssumed ? "warning" : undefined} />
          <Fact
            label="Decider"
            value={row.decider ?? (row.deciderStatus === "departed" ? "Departed" : "Nobody")}
            sub={row.decider ? (row.decider === row.owner ? "Also runs the tool" : `Tool owner: ${row.owner ?? "none"}`) : "No reminder reaches a person"}
            tone={row.decider ? undefined : "danger"}
          />
          <Fact label="Annual value" value={formatMoney(row.contractValue, row.currency)} sub={row.seats ? `${row.seats.active} active · ${row.seats.purchased} paid` : `${row.usage} usage`} />
        </div>

        {row.decideByShifted ? (
          <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">
            Decide-by moved earlier to the previous business day (it would have fallen on a {row.decideByShiftReason === "holiday" ? "company holiday" : "weekend"}).
          </Text>
        ) : null}
        {isWeekend(row.cancelByISO) ? (
          <Text as="p" className="text-[12px] leading-4 text-ui-tag-orange-text">Cancel-by falls on a weekend — send notice earlier so it is received in time.</Text>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 border-t border-ui-border-base pt-3">
          <label className="flex flex-col gap-1">
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Lead time (days before cancel-by)</Text>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={leadValue}
                aria-invalid={!leadValid}
                onChange={(event) => {
                  setLeadDraft(event.target.value);
                  const next = Number(event.target.value);
                  if (event.target.value.trim() !== "" && Number.isInteger(next) && next >= 0 && next <= 120) setLeadTimeOverride(slug, next === settings.leadTimeDays ? null : next);
                }}
                className={clx("h-8 w-20 rounded-[6px] border bg-ui-bg-base px-2 text-[14px] outline-none", leadValid ? "border-ui-border-base" : "border-ui-border-error")}
              />
              {resolution?.leadTimeOverrideDays !== undefined ? (
                <Button variant="transparent" size="small" onClick={() => { setLeadDraft(null); setLeadTimeOverride(slug, null); }}>Use org default ({settings.leadTimeDays})</Button>
              ) : (
                <Text as="span" className="text-[12px] text-ui-fg-muted">Org default</Text>
              )}
            </div>
          </label>
          <Button variant="secondary" size="small" onClick={onAssignDecider}>{row.decider ? "Change decider" : "Assign decider"}</Button>
          <Button variant="secondary" size="small" onClick={onEditTerms}>Edit terms</Button>
          {!row.inactive ? <Button variant="transparent" size="small" onClick={() => setInactive(slug, true)}>Mark as ended</Button> : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-ui-border-base pt-3">
          <div className="flex items-center justify-between gap-2">
            <Text as="span" className="text-[13px] font-medium text-ui-fg-base">Reminder ladder</Text>
            <Text as="span" className="text-[12px] text-ui-fg-muted">Counted back from decide-by · simulated delivery</Text>
          </div>
          <ol className="flex flex-col gap-1.5">
            {ladder.map(({ step, date }) => {
              const sent = sentFor(step.id);
              const state = sent.length > 0 ? "sent" : date > today ? "upcoming" : "none";
              return (
                <li key={step.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={clx("mt-1.5 size-2 shrink-0 rounded-full", state === "sent" ? "bg-ui-tag-green-icon" : state === "upcoming" ? "bg-ui-border-strong" : "bg-ui-tag-neutral-icon")} />
                    <div className="min-w-0">
                      <Text as="span" className="text-ui-fg-base">{stepLabel(step.id)} · {formatLongISO(date)}</Text>
                      {sent.length > 0 ? (
                        <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
                          Sent to {sent.map((entry) => `${entry.recipient} (${entry.channel})`).join(", ")}
                          {sent.some((entry) => entry.ackedAt) || resolution?.acks?.[step.id] ? " · acknowledged" : ""}
                        </Text>
                      ) : null}
                    </div>
                  </div>
                  <Text as="span" className="shrink-0 text-[12px] text-ui-fg-muted">{decided && state !== "sent" ? "Stopped" : state === "sent" ? "Sent" : state === "upcoming" ? "Scheduled" : "Not sent"}</Text>
                </li>
              );
            })}
          </ol>
          {decided ? <Text as="p" className="text-[12px] text-ui-fg-muted">Reminders stopped when the decision was recorded.</Text> : null}
          <div className="flex flex-wrap items-center gap-2">
            {latestUnacked && !decided ? (
              <Button variant="secondary" size="small" onClick={() => acknowledge(slug, latestUnacked.step)}>Acknowledge reminder</Button>
            ) : null}
            {!decided ? (
              <>
                <Button variant="transparent" size="small" disabled={snoozeDisabled} onClick={() => doSnooze(3)}>Snooze 3 days</Button>
                <Button variant="transparent" size="small" disabled={snoozeDisabled} onClick={() => doSnooze(7)}>Snooze 7 days</Button>
                <Text as="span" className="text-[12px] text-ui-fg-muted">
                  {snoozeActive ? `Snoozed until ${resolution!.snooze!.until} · ` : ""}{snoozeCount} of {settings.snoozeLimit} snoozes used
                </Text>
              </>
            ) : null}
          </div>
          {snoozeError ? <Text as="p" role="alert" className="text-[12px] text-ui-fg-error">{snoozeError}</Text> : null}
        </div>

        {suggestion ? (
          <div className="rounded-lg bg-ui-bg-subtle p-2.5">
            <Text as="p" className="text-[13px] text-ui-fg-base">
              <span className="font-medium">Starting point: {actionLabel(suggestion.action)}.</span> {suggestion.reasons.join(" · ")}.
            </Text>
            <Text as="p" className="mt-0.5 text-[12px] leading-4 text-ui-fg-muted">{suggestion.rule}</Text>
          </div>
        ) : null}
      </div>
    </section>
  );
}
