import { people } from "@/config/people";
import type { Renewal, RenewalSeed } from "@/features/renewal-risk/types";

import { liveTimeline } from "./live-timeline";
import type { RenewalDetail } from "./types";

/**
 * A detail page for a contract added by import. Only facts from the import are
 * shown: there is no seat, usage or payment data to display, so those sections
 * are empty and the view hides them rather than inventing numbers.
 */
export function buildAddedDetail(seed: RenewalSeed, row: Renewal, today: string): RenewalDetail {
  const timeline = liveTimeline(row, today, false);
  return {
    slug: row.id,
    vendor: seed.vendor,
    subtitle: seed.subtitle,
    logo: seed.logo,
    statusAlert: {
      tone: row.daysToCancelBy < 0 ? "danger" : "info",
      title: "Imported contract",
      description: "Added from a CSV. Only the imported fields are known; usage and payment history are not available.",
    },
    ...timeline,
    plan: { name: "Imported", purchasedSeats: 0, activeSeats: 0, unusedSeats: 0, usagePercent: 0, possibleWaste: "—" },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: row.owner !== null },
      { id: "usage", label: "Confirm usage need", done: false },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: people.map((person) => person.name),
    recommendation: {
      title: "Review before cancel-by",
      description: "No usage data was imported, so there is no basis for a suggestion yet. Confirm the notice terms, then decide.",
      primaryAction: "Review",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Renewal type", value: seed.contractType },
      { label: "Notice period", value: seed.noticePeriodDays === null ? "Not on file" : `${seed.noticePeriodDays} days` },
    ],
    usageEntitlement: [],
    ownership: seed.owner
      ? [{ label: "Current owner", value: seed.owner }, { label: "Status", value: "Assigned" }]
      : [{ label: "Status", value: "Unassigned" }],
    paymentHistory: [],
    usageTrend: [],
  };
}
