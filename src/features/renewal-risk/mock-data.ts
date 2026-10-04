import { assetPath } from "@/lib/assets";

import { importedRenewalSeeds } from "./imported-vendors";
import type { RenewalSeed } from "./types";

// Static fixtures until a real data source is wired up.

// Renewal dates, notice periods, contract values, owners and usage are the
// facts. Cancel-by, decide-by, risk, timing and ranking are computed in
// ./assessment from them, against the Oct 5 snapshot.
const curatedRenewals: RenewalSeed[] = [
  {
    vendor: "Salesforce",
    subtitle: "CRM",
    logo: assetPath("vendor-salesforce.png"),
    renewalDate: "2027-01-01",
    noticePeriodDays: 60,
    contractValue: 180_000,
    contractType: "Auto-renew",
    owner: "Priya Shah",
    team: null,
    usage: "65%",
    seats: { active: 261, purchased: 400 },
    yoyPercent: 12,
    status: "Awaiting owner",
    statusTone: "orange",
    action: "Review",
  },
];

// The decision queue: Salesforce from the curated fixtures, the rest from the data table.
export const renewals: RenewalSeed[] = [...curatedRenewals, ...importedRenewalSeeds];
