import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RenewalDetailView, renewalDetails } from "@/features/renewal-detail";

type PageParams = { vendor: string };

export function generateStaticParams(): PageParams[] {
  return Object.keys(renewalDetails).map((vendor) => ({ vendor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { vendor } = await params;
  const detail = renewalDetails[vendor];
  return { title: detail ? `Trellis | ${detail.vendor}` : "Trellis" };
}

export default async function RenewalDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { vendor } = await params;
  const detail = renewalDetails[vendor];

  if (!detail) {
    notFound();
  }

  return (
    <div className="h-full overflow-y-auto rounded-[12px] border border-ui-border-base bg-ui-bg-base">
      <RenewalDetailView detail={detail} />
    </div>
  );
}
