import { assetPath } from "@/lib/assets";

import { importedRenewalSeeds } from "./imported-vendors";
import type { RenewalSeed } from "./types";

// Static fixtures until a real data source is wired up.

// Renewal dates, notice periods, contract values, owners and usage are
// reconciled against each vendor's full record in @/features/renewal-detail/
// mock-data ("today" is Sep 26 there). Cancel-by, decide-by, risk, timing and
// ranking are all computed in ./assessment from these facts.
const curatedRenewals: RenewalSeed[] = [
  {
    vendor: "Salesforce",
    subtitle: "Project Management",
    logo: assetPath("vendor-salesforce.png"),
    renewalDate: "2026-10-20",
    noticePeriodDays: 30,
    contractValue: 180_000,
    contractType: "Auto-renew",
    owner: null,
    team: null,
    vacancy: "departed",
    formerOwner: "Elena Chen",
    usage: "64%",
    status: "Assign owner",
    statusTone: "orange",
    action: "Review",
  },
  {
    vendor: "Atlassian",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-atlassian.png"),
    renewalDate: "2026-12-20",
    noticePeriodDays: 30,
    contractValue: 96_000,
    contractType: "Auto-renew",
    owner: "Rohan Mehta",
    team: "Engineering",
    usage: "85%",
    status: "In review",
    statusTone: "blue",
    action: "Review",
  },
  {
    vendor: "Zapier",
    subtitle: "CRM",
    logo: assetPath("vendor-zapier.png"),
    renewalDate: "2026-10-28",
    noticePeriodDays: 30,
    contractValue: 96_000,
    contractType: "Manual",
    owner: null,
    team: null,
    vacancy: "unassigned",
    formerOwner: "Rohan Mehta",
    usage: "78%",
    status: "On track",
    statusTone: "green",
    action: "Assign",
  },
  {
    vendor: "Notion",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-notion.png"),
    renewalDate: "2026-12-06",
    noticePeriodDays: 30,
    contractValue: 96_000,
    contractType: "Month-to-month",
    owner: "Jasmine Patel",
    team: "Finance",
    usage: "88%",
    status: "Monitor",
    statusTone: "grey",
    action: "View",
  },
  {
    vendor: "Vercel",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-vercel.png"),
    renewalDate: "2026-12-06",
    noticePeriodDays: 30,
    contractValue: 96_000,
    contractType: "Month-to-month",
    owner: "Marcus Webb",
    team: "Engineering",
    usage: "91%",
    status: "Needs decision",
    statusTone: "red",
    action: "View",
  },
];

// The 18 vendors from the Trellis Figma file's data table (node 68:9270),
// appended to the 5 hand-tuned scenarios above rather than replacing them —
// Figma's own Salesforce/Notion rows have different numbers than the
// curated versions and were dropped to avoid a duplicate, conflicting entry.
export const renewals: RenewalSeed[] = [...curatedRenewals, ...importedRenewalSeeds];
