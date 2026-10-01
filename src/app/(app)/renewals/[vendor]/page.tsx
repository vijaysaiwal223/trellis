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
}: {
  params: Promise<PageParams>;
}) {
  const { vendor } = await params;
  const detail = renewalDetails[vendor] ?? genericRenewalDetails[vendor];

  if (!detail) {
    notFound();
  }

  return <RenewalDetailView detail={detail} />;
}
