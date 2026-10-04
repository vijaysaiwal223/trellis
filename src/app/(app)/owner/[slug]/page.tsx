import { OwnerDecision } from "@/features/owner-view/components/owner-decision";

export default async function OwnerDecisionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OwnerDecision slug={slug} />;
}
