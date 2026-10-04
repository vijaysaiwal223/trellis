import { assetPath } from "@/lib/assets";
import { now } from "@/lib/clock";
import { toVendorSlug } from "@/lib/vendor-slug";

import { riskFromScore, urgencyScore } from "./assessment";
import { calendarDateIn, computeCancelBy, daysBetween } from "./deadlines";
import type { BadgeColor, ContractType, RenewalSeed } from "./types";

/** Vendors with a logo file under public/assets/figma/. Empty string means initials render instead. */
const LOGO_EXTENSION: Partial<Record<string, string>> = {
  Slack: "png", Figma: "png", Zoom: "png", Jira: "png", Miro: "png", HubSpot: "png", Asana: "png",
  Gong: "png", Tableau: "png",
};

/**
 * Renewal facts for the subscriptions the decision queue tracks, from the
 * Trellis data table. "Negotiated" and "Auto-Renew" both behave as auto-renew:
 * silence still renews the contract.
 */
type RawVendorRecord = {
  vendor: string;
  category: string;
  contractValue: number;
  /** ISO date. */
  renewalDate: string;
  renewalType: "Auto-Renew" | "Negotiated" | "Manual";
  noticePeriodDays: number;
  purchasedSeats: number;
  activeSeats: number;
  /** Null when nobody is in charge. */
  owner: string | null;
  /** Set when the owner has left the company, so the tool is unowned and says why. */
  formerOwner?: string;
  yoyPercent: number;
};

const rawVendorRecords: RawVendorRecord[] = [
  { vendor: "Slack", category: "Collaboration", contractValue: 48_000, renewalDate: "2027-01-04", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 420, activeSeats: 368, owner: "Jordan Wu", yoyPercent: 8 },
  { vendor: "Figma", category: "Design", contractValue: 28_800, renewalDate: "2026-12-31", renewalType: "Manual", noticePeriodDays: 60, purchasedSeats: 60, activeSeats: 61, owner: null, yoyPercent: 5 },
  { vendor: "Zoom", category: "Collaboration", contractValue: 42_000, renewalDate: "2027-01-09", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 500, activeSeats: 312, owner: null, formerOwner: "Marcus Lee", yoyPercent: 8 },
  { vendor: "Jira", category: "Engineering", contractValue: 38_400, renewalDate: "2027-01-15", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 250, activeSeats: 238, owner: "Dev Patel", yoyPercent: 15 },
  { vendor: "Miro", category: "Collaboration", contractValue: 14_400, renewalDate: "2027-01-08", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 120, activeSeats: 38, owner: null, yoyPercent: 0 },
  { vendor: "HubSpot", category: "Marketing", contractValue: 64_800, renewalDate: "2026-12-31", renewalType: "Auto-Renew", noticePeriodDays: 60, purchasedSeats: 30, activeSeats: 22, owner: "Elena Ruiz", yoyPercent: 18 },
  { vendor: "Asana", category: "Operations", contractValue: 21_600, renewalDate: "2027-01-31", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 180, activeSeats: 97, owner: "Tom Becker", yoyPercent: 10 },
  { vendor: "Tableau", category: "Analytics", contractValue: 57_600, renewalDate: "2027-02-01", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 80, activeSeats: 41, owner: "Sam Okafor", yoyPercent: 9 },
  { vendor: "Gong", category: "Sales", contractValue: 96_000, renewalDate: "2027-01-01", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 120, activeSeats: 88, owner: "Priya Shah", yoyPercent: 14 },
  { vendor: "DocuSign", category: "Legal", contractValue: 24_000, renewalDate: "2027-02-03", renewalType: "Auto-Renew", noticePeriodDays: 90, purchasedSeats: 120, activeSeats: 96, owner: "Nadia Brooks", yoyPercent: 4 },
];

const TODAY_ISO = calendarDateIn(now(), "UTC");

function contractTypeFor(raw: RawVendorRecord): ContractType {
  return raw.renewalType === "Manual" ? "Manual" : "Auto-renew";
}

// Empty string means Avatar renders its initials fallback instead of a
// broken image — used for any vendor without a real logo file.
function logoFor(raw: RawVendorRecord): string {
  const extension = LOGO_EXTENSION[raw.vendor];
  return extension ? assetPath(`vendor-${toVendorSlug(raw.vendor)}.${extension}`) : "";
}

function toRenewalSeed(raw: RawVendorRecord): RenewalSeed {
  const daysToCancelBy = daysBetween(TODAY_ISO, computeCancelBy(raw.renewalDate, raw.noticePeriodDays));
  const ownerless = raw.owner === null;
  const contractType = contractTypeFor(raw);
  const usage = Math.round((raw.activeSeats / raw.purchasedSeats) * 100);
  // The default status label has to agree with the computed risk badge.
  const risk = riskFromScore(urgencyScore({ daysToCancelBy, contractValue: raw.contractValue, contractType, ownerless }));
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
    renewalDate: raw.renewalDate,
    noticePeriodDays: raw.noticePeriodDays,
    contractValue: raw.contractValue,
    contractType,
    owner: raw.owner,
    team: null,
    vacancy: raw.formerOwner ? "departed" : ownerless ? "unassigned" : undefined,
    formerOwner: raw.formerOwner,
    usage: `${usage}%`,
    seats: { active: raw.activeSeats, purchased: raw.purchasedSeats },
    yoyPercent: raw.yoyPercent,
    ...status,
  };
}

export const importedRenewalSeeds: RenewalSeed[] = rawVendorRecords.map(toRenewalSeed);
