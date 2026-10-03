import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { genericRenewalDetails, RenewalDetailView, renewalDetails } from "@/features/renewal-detail";

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

  if (!detail) {
    notFound();
  }

  const initialTask = requestedTask === "assign" || requestedTask === "decision" || requestedTask === "follow-up"
    ? requestedTask
    : null;
  return <RenewalDetailView key={`${vendor}-${initialTask ?? "view"}`} detail={detail} initialTask={initialTask} />;
}
