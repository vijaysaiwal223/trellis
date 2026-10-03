"use client";

import { clx, Text } from "@medusajs/ui";
import { useCallback, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAiAssistant } from "@/components/layout/ai-assistant-state";
import { people } from "@/config/people";
import { renewalTask, renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { formatLongISO } from "@/features/renewal-risk/deadlines";
import { followUpTasksFor } from "@/features/renewal-risk/follow-up";
import { formatMoney } from "@/features/renewal-risk/money";
import { isDecisionCurrent } from "@/features/renewal-risk/workflow";
import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { AiInsight } from "./ai-insight";
import { AssignDeciderModal } from "./assign-decider-modal";
import { AssignOwnerModal } from "./assign-owner-modal";
import { DecisionBriefCard } from "./decision-brief-card";
import { DetailHeader } from "./detail-header";
import { DetailListCard } from "./detail-list-card";
import { FollowUpCard } from "./follow-up-card";
import { PaymentHistoryChart } from "./payment-history-chart";
import { RecommendationCard } from "./recommendation-card";
import { RenewalTimeline } from "./renewal-timeline";
import { SeatUtilizationChart } from "./seat-utilization-chart";
import { TermsModal } from "./terms-modal";
import { UsageTrendChart } from "./usage-trend-chart";
import type { DetailTab } from "../constants";
import { actionLabel, type RenewalDetail } from "../types";
import { liveTimeline } from "../live-timeline";
import { buildAiSuggestionFacts, type AiSuggestion } from "../ai-suggestion";
import type { OwnerRecommendationRequest } from "../owner-recommendation";

export function RenewalDetailView({ detail, initialTask = null }: { detail: RenewalDetail; initialTask?: "assign" | "decision" | "follow-up" | "terms" | null }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [reviewOpenLocal, setReviewOpenLocal] = useState(initialTask === "decision" || initialTask === "follow-up");
  const [assignOwnerOpen, setAssignOwnerOpen] = useState(initialTask === "assign");
  const [termsOpen, setTermsOpen] = useState(initialTask === "terms");
  const [deciderOpen, setDeciderOpen] = useState(false);
  const { suggestions, setSuggestion, reviewRequest, clearReviewRequest } = useAiAssistant();
  const reviewOpen = reviewOpenLocal || reviewRequest === detail.slug;
  const closeReview = () => {
    setReviewOpenLocal(false);
    clearReviewRequest();
  };
  const { resolutions, assignOwner, assignDecider, confirmDecision, setTerms, departedOwners, flags, today } = useRenewalRuntime();
  const decisionsOn = flags.renewalDecisions;
  const resolution = resolutions[detail.slug];
  const recordedDecision = resolution?.decision && !resolution.decision.draft ? resolution.decision : null;
  const assessed = useAssessedRenewals(renewals, { includeInactive: true });
  const assessedRow = assessed.find((entry) => entry.slug === detail.slug)?.row;
  // A decision made on older terms or for an earlier cycle is shown in the brief, but no longer counts here.
  const decision = recordedDecision && (!assessedRow || isDecisionCurrent(assessedRow, resolution)) ? recordedDecision : null;
  const nextTask = assessedRow ? renewalTask(assessedRow, resolution) : null;
  const daysToCancelBy = assessedRow?.daysToCancelBy ?? 0;
  const isPastCancelBy = daysToCancelBy < 0;

  const currentOwner = detail.ownership.find((row) => row.label === "Current owner")?.value;
  const ownerDeparted = !resolution?.ownerAssigned && !!currentOwner && departedOwners.includes(currentOwner);
  const ownerOptions = useMemo(
    () => detail.ownerOptions.filter((name) => !departedOwners.includes(name)),
    [detail.ownerOptions, departedOwners],
  );
  const ownerRecommendationFacts = useMemo<OwnerRecommendationRequest>(() => ({
    vendor: detail.vendor,
    category: detail.subtitle,
    daysToCancelBy,
    preferredNames: ownerOptions,
    candidates: people
      .filter((person) => !departedOwners.includes(person.name))
      .map((person) => {
        const assigned = assessed.filter((entry) => entry.slug !== detail.slug && entry.row.owner === person.name);
        return {
          name: person.name,
          team: person.team,
          assignedRenewals: assigned.length,
          relatedRenewals: assigned.filter((entry) => entry.row.subtitle === detail.subtitle).length,
        };
      }),
  }), [detail.vendor, detail.subtitle, detail.slug, daysToCancelBy, ownerOptions, assessed, departedOwners]);

  const ownership = useMemo(() => {
    if (resolution?.ownerAssigned) {
      return [
        { label: "Current owner", value: resolution.ownerAssigned },
        { label: "Status", value: "Assigned" },
      ];
    }
    if (ownerDeparted) {
      return [
        { label: "Previous owner", value: currentOwner ?? "—" },
        { label: "Status", value: "Departed" },
        { label: "Candidate to review", value: ownerOptions[0] ?? "—" },
      ];
    }
    return detail.ownership.map((row) => row.label === "Suggested owner" ? { ...row, label: "Candidate to review" } : row);
  }, [detail.ownership, resolution, ownerDeparted, currentOwner, ownerOptions]);

  const statusAlert = useMemo(() => {
    if (decision) {
      const closed = isDecisionClosed(decision);
      // Recording intent does not prove that the vendor or finance acted.
      const pendingCopy: Partial<Record<typeof decision.action, string>> = {
        Renew: `Renewal decision recorded for ${detail.vendor}. Confirm the renewal outcome before closing this risk.`,
        Cancel: isPastCancelBy
          ? `Decision to request goodwill cancellation recorded for ${detail.vendor}. Contact the vendor; cancellation requires their agreement.`
          : `Decision to cancel ${detail.vendor} recorded. Contact the vendor before cancel-by and confirm their response.`,
        Renegotiate: `Renegotiation decision recorded for ${detail.vendor}. Agree new terms with the vendor and confirm the outcome before closing this risk.`,
        "Right-size": `Downsize decision recorded for ${detail.vendor}. Agree the smaller plan with the vendor and confirm the outcome before closing this risk.`,
        Escalate: `Decision to escalate ${detail.vendor} recorded. Finance still needs to review and make a final call.`,
      };
      const defaultDescription = closed
        ? `${detail.vendor}'s ${actionLabel(decision.action).toLowerCase()} outcome was marked confirmed in Trellis.`
        : (pendingCopy[decision.action] ?? `${detail.vendor} has a decision pending follow-through.`);
      return {
        tone: closed ? "success" : decision.action === "Escalate" ? "danger" : "warning",
        title: `${closed ? "Outcome confirmed" : "Decision recorded — pending"} — ${actionLabel(decision.action)}`,
        description: decision.note ? `${defaultDescription} "${decision.note}"` : defaultDescription,
      } as const;
    }
    return detail.statusAlert;
  }, [decision, detail, isPastCancelBy]);

  const currentOwnerName = resolution?.ownerAssigned ?? (ownerDeparted ? undefined : currentOwner);

  // With Renewal Decisions on, the timeline and contract rows are computed from the live deadlines.
  const timelineDetail = useMemo<RenewalDetail>(
    () => (decisionsOn && assessedRow ? { ...detail, ...liveTimeline(assessedRow, today, Boolean(decision)) } : detail),
    [decisionsOn, assessedRow, detail, today, decision],
  );
  const contractRows = useMemo(() => {
    if (!decisionsOn || !assessedRow) return detail.contactDetails;
    const swap = (label: string, value: string) => ({ label, value });
    const rows = detail.contactDetails.map((entry) =>
      entry.label === "Notice period"
        ? swap("Notice period", assessedRow.noticeAssumed ? `${assessedRow.noticeDays} days (assumed)` : `${assessedRow.noticeDays} days`)
        : entry.label === "Annual contract" ? swap("Annual contract", formatMoney(assessedRow.contractValue, assessedRow.currency)) : entry,
    );
    return [...rows, swap("Decide by", assessedRow.decideBy), swap("Cancel-by", assessedRow.cancelBy), swap("Renewal date", formatLongISO(assessedRow.renewalDate))];
  }, [decisionsOn, assessedRow, detail.contactDetails]);
  const deciderRows = decisionsOn && assessedRow
    ? [{ label: "Decider", value: assessedRow.decider ?? "Nobody assigned" }]
    : [];
  const aiFacts = useMemo(
    () => buildAiSuggestionFacts(detail, assessedRow, currentOwnerName, ownerDeparted),
    [detail, assessedRow, currentOwnerName, ownerDeparted],
  );
  const insightKey = JSON.stringify(aiFacts);
  const currentAiSuggestion = suggestions[detail.slug]?.key === insightKey ? suggestions[detail.slug].value : null;
  const handleAiSuggestion = useCallback((value: AiSuggestion | null) => {
    setSuggestion(detail.slug, insightKey, value);
  }, [detail.slug, insightKey, setSuggestion]);

  return (
    <div className="relative flex h-full min-h-0 w-full">
      <div className={clx(
        "flex min-w-0 flex-1 flex-col overflow-y-auto rounded-[12px] border border-ui-border-base bg-ui-bg-base"
      )}>
      <DetailHeader
        detail={detail}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReviewRenewal={() => setReviewOpenLocal(true)}
        hasActiveOwner={!!currentOwnerName}
        onOpenAssignOwner={() => setAssignOwnerOpen(true)}
      />

      {activeTab === "Overview" ? (
        <div className="flex w-full flex-1 items-stretch ">
          <div className="flex min-w-0 flex-[1_0_0] flex-col gap-4 p-4">
            <Alert tone={statusAlert.tone}>
              <div className="flex flex-col gap-1">
                <Text as="span" className="text-[14px] font-medium leading-5 tracking-[-0.105px] text-ui-fg-base">
                  {statusAlert.title}
                </Text>
                <Text as="span" className="text-[14px] leading-5 tracking-[-0.03px] text-ui-fg-base">
                  {statusAlert.description}
                </Text>
              </div>
            </Alert>

            {nextTask ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle px-3 py-2.5">
                <div className="min-w-0">
                  <Text as="p" className="text-[11px] font-medium uppercase tracking-wide text-ui-fg-muted">Next step · {nextTask.due}</Text>
                  <Text as="p" className="text-[14px] font-medium leading-5 text-ui-fg-base">{nextTask.title}</Text>
                  <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">{nextTask.description}</Text>
                </div>
                <Button variant={nextTask.level === "lead" || nextTask.level === "overdue" ? "primary" : "secondary"} size="small" onClick={() => {
                  if (nextTask.kind === "assign") setAssignOwnerOpen(true);
                  else setReviewOpenLocal(true);
                }}>{nextTask.action}</Button>
              </div>
            ) : null}

            {/* No seat data (an imported contract) means nothing for Bruno to reason about. */}
            {detail.plan.purchasedSeats > 0 ? (
              <AiInsight
                key={insightKey}
                fallbackText={detail.recommendation.description}
                facts={aiFacts}
                onSuggestion={handleAiSuggestion}
              />
            ) : null}

            {decisionsOn && assessedRow ? (
              <DecisionBriefCard row={assessedRow} slug={detail.slug} onEditTerms={() => setTermsOpen(true)} onAssignDecider={() => setDeciderOpen(true)} />
            ) : null}

            <RenewalTimeline detail={timelineDetail} />

            {decisionsOn && assessedRow && recordedDecision && decision ? <FollowUpCard row={assessedRow} slug={detail.slug} decision={recordedDecision} /> : null}

            {detail.plan.purchasedSeats > 0 ? <SeatUtilizationChart detail={detail} /> : null}

            <div className="flex w-full items-stretch gap-4">
              {detail.paymentHistory.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <PaymentHistoryChart detail={detail} />
                </div>
              ) : null}
              {detail.usageTrend.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <UsageTrendChart detail={detail} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex w-[360px] shrink-0 flex-col gap-4 self-stretch border-l border-ui-border-base bg-ui-bg-base p-4">
            <DetailListCard title="Ownership" rows={[...ownership, ...deciderRows]} />
            <DetailListCard title="Contract details" rows={contractRows} />
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4"
        >
          <div className="w-full max-w-[560px]">
            <RecommendationCard
              detail={detail}
              decision={resolution?.decision ?? null}
              history={resolution?.history ?? []}
              ownerOptions={ownerOptions}
              currentOwnerName={currentOwnerName}
              onSave={(record) => {
                if (!record.draft && record.ownerName && record.ownerName !== currentOwnerName) {
                  assignOwner(detail.slug, record.ownerName);
                }
                // A new answer brings its own follow-through; re-saving the same one keeps the ticked tasks.
                const sameAnswer = resolution?.decision && !resolution.decision.draft && resolution.decision.action === record.action;
                const tasks = !record.draft && assessedRow && !record.tasks
                  ? (sameAnswer ? resolution?.decision?.tasks : followUpTasksFor(record.action, assessedRow, today))
                  : record.tasks;
                confirmDecision(detail.slug, { ...record, tasks });
              }}
              onClose={closeReview}
              isPastCancelBy={isPastCancelBy}
              daysToCancelBy={daysToCancelBy}
              decideBy={decisionsOn ? assessedRow?.decideBy : undefined}
              recordContext={decisionsOn && assessedRow ? { cycle: assessedRow.renewalDate, termsSnapshot: assessedRow.termsSnapshot } : undefined}
              suggestedAction={currentAiSuggestion?.action}
              suggestedReasoning={currentAiSuggestion?.reasoning}
            />
          </div>
        </div>
      ) : null}

      {termsOpen && assessedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4">
          <TermsModal row={assessedRow} onSave={(terms) => setTerms(detail.slug, terms)} onClose={() => setTermsOpen(false)} />
        </div>
      ) : null}

      {deciderOpen && assessedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4" onClick={() => setDeciderOpen(false)}>
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-[440px]">
            <AssignDeciderModal
              vendor={detail.vendor}
              toolOwner={assessedRow.owner}
              current={assessedRow.decider}
              departedOwners={departedOwners}
              onAssign={(name) => assignDecider(detail.slug, name)}
              onClose={() => setDeciderOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {assignOwnerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4"
          onClick={() => setAssignOwnerOpen(false)}
        >
          <div className="w-full max-w-[558px]" onClick={(event) => event.stopPropagation()}>
            {ownerRecommendationFacts.candidates.length > 0 ? <AssignOwnerModal
              detail={detail}
              previousOwnerName={assessedRow?.formerOwner}
              previousOwnerDeparted={assessedRow?.ownerStatus === "departed"}
              recommendationFacts={ownerRecommendationFacts}
              isPastCancelBy={isPastCancelBy}
              onAssign={(name) => assignOwner(detail.slug, name)}
              onClose={() => setAssignOwnerOpen(false)}
            /> : (
              <div role="dialog" aria-modal="true" aria-label="No eligible owners" className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-flyout">
                <Text as="p" className="text-[16px] font-semibold text-ui-fg-base">No eligible owners</Text>
                <Text as="p" className="mt-2 text-[14px] text-ui-fg-subtle">All people in the Trellis directory are marked as departed. Reinstate someone in Settings before assigning this renewal.</Text>
                <button type="button" onClick={() => setAssignOwnerOpen(false)} className="mt-4 rounded-md bg-ui-bg-interactive px-3 py-2 text-[14px] font-medium text-white">Close</button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "Users" ? (
        <div className="flex w-full flex-col gap-4 p-4">
          <Alert tone="neutral">
            <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
              Trellis doesn&apos;t have individual seat-holder data for {detail.vendor} — only aggregate purchased vs.
              active seats. See the Overview tab for that breakdown ({detail.plan.activeSeats} of{" "}
              {detail.plan.purchasedSeats} seats active).
            </Text>
          </Alert>
        </div>
      ) : null}

      {activeTab === "Report" ? (
        <div className="flex w-full flex-col gap-4 p-4">
          <Alert tone="neutral">
            <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
              Reporting for {detail.vendor} is coming soon.
            </Text>
          </Alert>
        </div>
      ) : null}
      </div>

    </div>
  );
}
