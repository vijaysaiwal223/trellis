import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { genericRenewalDetails, renewalDetails } from "@/features/renewal-detail";
import { OwnerDecisionView } from "@/features/owner-decision/components/owner-decision-view";

type PageParams = { vendor: string };
type PageSearchParams = { action?: string; t?: string | string[] };

const validActions = ["Renew", "Right-size", "Cancel", "Not mine"] as const;

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
  return { title: detail ? `${detail.vendor} renewal — decide` : "Trellis" };
}

export default async function OwnerDecisionPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { vendor } = await params;
  const { action, t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;
  const detail = renewalDetails[vendor] ?? genericRenewalDetails[vendor];

  if (!detail) {
    notFound();
  }

  const presetAction = validActions.find((candidate) => candidate === action);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-ui-bg-subtle px-4 py-10">
      <OwnerDecisionView detail={detail} presetAction={presetAction} token={token} />
    </div>
  );
}
