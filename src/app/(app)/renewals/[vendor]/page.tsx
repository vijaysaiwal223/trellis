import type { Metadata } from "next";

import { genericRenewalDetails, RenewalDetailView, renewalDetails } from "@/features/renewal-detail";
import { AddedContractView } from "@/features/renewal-detail/components/added-contract-view";

type PageParams = { vendor: string };

export function generateStaticParams(): PageParams[] {
  return Object.keys({ ...renewalDetails, ...genericRenewalDetails }).map((vendor) => ({ vendor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { vendor } = await params;
  const detail = renewalDetails[vendor] ?? genericRenewalDetails[vendor];
  return { title: detail ? `Trellis | ${detail.vendor}` : "Trellis" };
}

export default async function RenewalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ task?: string | string[] }>;
}) {
  const { vendor } = await params;
  const requestedTask = (await searchParams).task;
  const detail = renewalDetails[vendor] ?? genericRenewalDetails[vendor];

  const initialTask = requestedTask === "assign" || requestedTask === "decision" || requestedTask === "follow-up" || requestedTask === "terms"
    ? requestedTask
    : null;
  // Not a built-in fixture: it may be a contract imported in this browser.
  if (!detail) return <AddedContractView slug={vendor} initialTask={initialTask} />;
  return <RenewalDetailView key={`${vendor}-${initialTask ?? "view"}`} detail={detail} initialTask={initialTask} />;
}
