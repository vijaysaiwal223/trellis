"use client";

import { Text } from "@medusajs/ui";
import Link from "next/link";
import { useMemo } from "react";

import { OwnerDecisionView } from "@/features/owner-decision/components/owner-decision-view";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { buildAddedDetail } from "../added-detail";

import { RenewalDetailView } from "./renewal-detail-view";

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex h-full w-full flex-col items-start gap-2 rounded-[12px] border border-ui-border-base bg-ui-bg-base p-6">
      <Text as="p" className="text-[16px] font-medium text-ui-fg-base">No contract called “{slug}”</Text>
      <Text as="p" className="text-[14px] text-ui-fg-subtle">Contracts added by import live in this browser only. If you cleared it or reset the demo, import the file again.</Text>
      <Link href="/" className="text-[14px] font-medium text-ui-fg-interactive hover:underline">Back to Renewal Risk</Link>
    </div>
  );
}

/** Resolves a contract that was imported in this browser, for routes that only know static fixtures. */
function useAddedContract(slug: string) {
  const { ready, addedContracts, today } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const seed = addedContracts.find((entry) => entry.id === slug);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const detail = useMemo(() => (seed && row ? buildAddedDetail(seed, row, today) : null), [seed, row, today]);
  return { ready, detail };
}

export function AddedContractView({ slug, initialTask }: { slug: string; initialTask: "assign" | "decision" | "follow-up" | "terms" | null }) {
  const { ready, detail } = useAddedContract(slug);
  if (!ready) return null;
  return detail ? <RenewalDetailView detail={detail} initialTask={initialTask} /> : <NotFound slug={slug} />;
}

export function AddedContractDecide({ slug, token }: { slug: string; token?: string }) {
  const { ready, detail } = useAddedContract(slug);
  if (!ready) return null;
  return detail ? <OwnerDecisionView detail={detail} token={token} /> : <NotFound slug={slug} />;
}
