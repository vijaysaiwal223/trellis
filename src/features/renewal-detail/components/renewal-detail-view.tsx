"use client";

import { Text } from "@medusajs/ui";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { AiSuggestionCard } from "./ai-suggestion-card";
import { AssignOwnerModal } from "./assign-owner-modal";
import { DetailHeader } from "./detail-header";
import { DetailListCard } from "./detail-list-card";
import { PaymentHistoryChart } from "./payment-history-chart";
import { RecommendationCard } from "./recommendation-card";
import { RenewalTimeline } from "./renewal-timeline";
import { SeatUtilizationChart } from "./seat-utilization-chart";
import type { DetailTab } from "../constants";
import type { RenewalDetail } from "../types";

export function RenewalDetailView({ detail }: { detail: RenewalDetail }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [assignOwnerOpen, setAssignOwnerOpen] = useState(false);
  const { resolutions, assignOwner, confirmDecision, departedOwners } = useRenewalRuntime();
  const resolution = resolutions[detail.slug];
  const decision = resolution?.decision && !resolution.decision.draft ? resolution.decision : null;
  const assessed = useAssessedRenewals(renewals);
  const assessedRow = assessed.find((entry) => entry.slug === detail.slug)?.row;
  const daysToCancelBy = assessedRow?.daysToCancelBy ?? 0;
  const isPastCancelBy = daysToCancelBy < 0;

  const currentOwner = detail.ownership.find((row) => row.label === "Current owner")?.value;
  const ownerDeparted = !resolution?.ownerAssigned && !!currentOwner && departedOwners.includes(currentOwner);
  const ownerOptions = detail.ownerOptions.filter((name) => !departedOwners.includes(name));

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
        { label: "Suggested owner", value: ownerOptions[0] ?? "—" },
      ];
    }
    return detail.ownership;
  }, [detail.ownership, resolution, ownerDeparted, currentOwner, ownerOptions]);

  const statusAlert = useMemo(() => {
    if (decision) {
      const tone =
        decision.action === "Cancel"
          ? "info"
          : decision.action === "Renew" || decision.action === "Right-size"
            ? "success"
            : "danger";
      return {
        tone,
        title: `Decision recorded — ${decision.action}`,
        description:
          decision.note ||
          `${detail.vendor} marked to ${decision.action.toLowerCase()} by you just now. No further action needed until the next cycle.`,
      } as const;
    }
    return detail.statusAlert;
  }, [decision, detail]);

  const currentOwnerName = resolution?.ownerAssigned ?? (ownerDeparted ? undefined : currentOwner);

  return (
    <div className="flex h-full w-full flex-col">
      <DetailHeader
        detail={detail}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReviewRenewal={() => setReviewOpen(true)}
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

            <AiSuggestionCard text={detail.recommendation.description} />

            <SeatUtilizationChart detail={detail} />

            <div className="flex w-full items-start gap-4">
              <div className="min-w-0 flex-1">
                <PaymentHistoryChart detail={detail} />
              </div>
              <div className="min-w-0 flex-1">
                <RenewalTimeline detail={detail} />
              </div>
            </div>
          </div>

          <div className="flex w-[360px] shrink-0 flex-col gap-4 self-stretch border-l border-ui-border-base bg-ui-bg-base p-4">
            <DetailListCard title="Ownership" rows={ownership} />
            <DetailListCard title="Contract details" rows={detail.contactDetails} />
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4"
          onClick={() => setReviewOpen(false)}
        >
          <div className="w-full max-w-[560px]" onClick={(event) => event.stopPropagation()}>
            <RecommendationCard
              detail={detail}
              decision={resolution?.decision ?? null}
              ownerOptions={ownerOptions}
              currentOwnerName={currentOwnerName}
              onAssignOwner={(name) => assignOwner(detail.slug, name)}
              onSave={(record) => confirmDecision(detail.slug, record)}
              onClose={() => setReviewOpen(false)}
              isPastCancelBy={isPastCancelBy}
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
            <AssignOwnerModal
              detail={detail}
              previousOwnerName={assessedRow?.formerOwner}
              previousOwnerDeparted={assessedRow?.ownerStatus === "departed"}
              suggestedOwner={ownerOptions[0]}
              isPastCancelBy={isPastCancelBy}
              onAssign={(name) => assignOwner(detail.slug, name)}
              onClose={() => setAssignOwnerOpen(false)}
            />
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
  );
}
