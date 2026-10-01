import { assetPath } from "@/lib/assets";
import { toVendorSlug } from "@/lib/vendor-slug";

import { riskFromScore, urgencyScore } from "./assessment";
import type { BadgeColor, ContractType, RenewalSeed } from "./types";

/**
 * Vendors with a real logo file under public/assets/figma/. Most came from
 * the Figma file's "logos" frame (node 187:19914) as .png; Snowflake's was
 * added separately as a .jpeg, hence the per-vendor extension.
 */
const LOGO_EXTENSION: Partial<Record<string, string>> = {
  Slack: "png", Figma: "png", Zoom: "png", GitHub: "png", Jira: "png", Miro: "png",
  HubSpot: "png", Datadog: "png", Dropbox: "png", Asana: "png", Zendesk: "png",
  "Adobe Creative Cloud": "png", "Microsoft 365": "png", Intercom: "png",
  Airtable: "png", Okta: "png", Superhuman: "png", Snowflake: "jpeg",
};

/**
 * Raw rows from the Trellis Figma file's data table (node 68:9270), minus
 * Salesforce and Notion — those already exist in `mock-data.ts` as
 * hand-tuned demo scenarios (missed deadline + departed owner, healthy
 * usage) with numbers that conflict with this table's generic versions, so
 * the curated ones stay and these aren't re-imported under the same name.
 *
 * "Negotiated" (the source table's renewal type) isn't one of our three
 * ContractType values. Treated as "Auto-renew": a negotiated enterprise
 * contract still typically carries an auto-renewal clause unless the MSA
 * says otherwise, so silence is still the risky default — same reasoning
 * the rest of the product uses to flag auto-renew as the dangerous case.
 */
type RawVendorRecord = {
  vendor: string;
  category: string;
  contractValue: number;
  /** ISO date. */
  renewalDate: string;
  renewalType: "Auto-Renew" | "Negotiated";
  noticePeriodDays: number;
  purchasedSeats: number;
  activeSeats: number;
  owner: string | null;
  yoyPercent: number;
};

export const rawVendorRecords: RawVendorRecord[] = [
  { vendor: "Slack", category: "Collaboration", contractValue: 48_000, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 420, activeSeats: 368, owner: "Sarah Chen", yoyPercent: 8 },
  { vendor: "Figma", category: "Design", contractValue: 32_400, renewalDate: "2027-03-31", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 120, activeSeats: 94, owner: "Alex Morgan", yoyPercent: 5 },
  { vendor: "Zoom", category: "Communication", contractValue: 28_800, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 400, activeSeats: 216, owner: "Priya Sharma", yoyPercent: 4 },
  { vendor: "GitHub", category: "Engineering", contractValue: 72_000, renewalDate: "2027-03-31", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 260, activeSeats: 238, owner: "James Wilson", yoyPercent: 6 },
  { vendor: "Jira", category: "Project Management", contractValue: 55_000, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 350, activeSeats: 302, owner: "Emily Clark", yoyPercent: 9 },
  { vendor: "Miro", category: "Collaboration", contractValue: 24_000, renewalDate: "2027-09-30", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 200, activeSeats: 86, owner: null, yoyPercent: 12 },
  { vendor: "HubSpot", category: "Marketing", contractValue: 84_000, renewalDate: "2026-12-20", renewalType: "Negotiated", noticePeriodDays: 90, purchasedSeats: 80, activeSeats: 67, owner: "Rachel Adams", yoyPercent: 7 },
  { vendor: "Datadog", category: "Monitoring", contractValue: 126_000, renewalDate: "2027-03-31", renewalType: "Negotiated", noticePeriodDays: 60, purchasedSeats: 150, activeSeats: 142, owner: "Chris Lee", yoyPercent: 15 },
  { vendor: "Dropbox", category: "Storage", contractValue: 38_400, renewalDate: "2027-06-30", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 320, activeSeats: 174, owner: "Amanda Patel", yoyPercent: 3 },
  { vendor: "Asana", category: "Project Management", contractValue: 33_600, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 240, activeSeats: 113, owner: null, yoyPercent: 6 },
  { vendor: "Zendesk", category: "Customer Support", contractValue: 68_000, renewalDate: "2027-01-05", renewalType: "Negotiated", noticePeriodDays: 90, purchasedSeats: 95, activeSeats: 83, owner: "Olivia Brown", yoyPercent: 8 },
  { vendor: "Adobe Creative Cloud", category: "Design", contractValue: 94_500, renewalDate: "2027-03-31", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 150, activeSeats: 121, owner: "Alex Morgan", yoyPercent: 5 },
  { vendor: "Microsoft 365", category: "Productivity", contractValue: 156_000, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 650, activeSeats: 604, owner: "Kevin Miller", yoyPercent: 4 },
  { vendor: "Intercom", category: "Customer Support", contractValue: 42_000, renewalDate: "2027-03-30", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 75, activeSeats: 58, owner: "Sophia Garcia", yoyPercent: 13 },
  { vendor: "Airtable", category: "Productivity", contractValue: 29_400, renewalDate: "2027-06-30", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 180, activeSeats: 72, owner: null, yoyPercent: 9 },
  { vendor: "Okta", category: "Security", contractValue: 108_000, renewalDate: "2026-12-31", renewalType: "Negotiated", noticePeriodDays: 90, purchasedSeats: 500, activeSeats: 472, owner: "Robert Taylor", yoyPercent: 7 },
  { vendor: "Superhuman", category: "Productivity", contractValue: 18_000, renewalDate: "2027-04-01", renewalType: "Auto-Renew", noticePeriodDays: 30, purchasedSeats: 200, activeSeats: 98, owner: "Megan Scott", yoyPercent: 0 },
  { vendor: "Snowflake", category: "Data & Analytics", contractValue: 240_000, renewalDate: "2026-12-31", renewalType: "Negotiated", noticePeriodDays: 90, purchasedSeats: 85, activeSeats: 79, owner: "Ethan Davis", yoyPercent: 18 },
];

/** Matches the fixed "Today" anchor shown throughout the prototype's timelines. */
export const TODAY = new Date("2026-09-26T00:00:00Z");

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function contractTypeFor(): ContractType {
  // Both source values ("Auto-Renew" and "Negotiated") map to "Auto-renew" —
  // see the module comment above for why "Negotiated" isn't treated as safer.
  return "Auto-renew";
}

export function cancelByDateFor(raw: RawVendorRecord): Date {
  return addDays(new Date(`${raw.renewalDate}T00:00:00Z`), -raw.noticePeriodDays);
}

export function usagePercentFor(raw: RawVendorRecord): number {
  return Math.round((raw.activeSeats / raw.purchasedSeats) * 100);
}

// Empty string means Avatar renders its initials fallback instead of a
// broken image — used for any vendor without a real logo file.
export function logoFor(raw: RawVendorRecord): string {
  const extension = LOGO_EXTENSION[raw.vendor];
  return extension ? assetPath(`vendor-${toVendorSlug(raw.vendor)}.${extension}`) : "";
}

function toRenewalSeed(raw: RawVendorRecord): RenewalSeed {
  const cancelByDate = cancelByDateFor(raw);
  const daysToCancelBy = daysBetween(TODAY, cancelByDate);
  const ownerless = raw.owner === null;
  // The default status label has to agree with the computed risk badge —
  // "On track" next to a Critical badge is exactly the contradiction this
  // product exists to catch (it's one of the bugs fixed earlier in this
  // session for the curated vendors; the imported batch needs the same rule).
  const risk = riskFromScore(
    urgencyScore({ daysToCancelBy, contractValue: raw.contractValue, contractType: contractTypeFor(), ownerless }),
  );
  const status: { status: string; statusTone: BadgeColor; action: string } = ownerless
    ? { status: "Assign owner", statusTone: "orange", action: "Assign" }
    : risk === "Critical" || risk === "High"
      ? { status: "Needs decision", statusTone: "red", action: "Review" }
      : risk === "Medium"
        ? { status: "Monitor", statusTone: "grey", action: "View" }
        : { status: "On track", statusTone: "green", action: "View" };

  return {
    vendor: raw.vendor,
    subtitle: raw.category,
    logo: logoFor(raw),
    cancelBy: formatShortDate(cancelByDate),
    daysToCancelBy,
    contractValue: raw.contractValue,
    contractType: contractTypeFor(),
    owner: raw.owner,
    team: null,
    vacancy: ownerless ? "unassigned" : undefined,
    usage: `${usagePercentFor(raw)}%`,
    ...status,
  };
}

export const importedRenewalSeeds: RenewalSeed[] = rawVendorRecords.map(toRenewalSeed);
