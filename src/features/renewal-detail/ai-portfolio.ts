import type { Renewal } from "@/features/renewal-risk/types";


export type AiPortfolioFacts = {
  renewals: Array<{
    vendor: string;
    category: string;
    contractValue: number;
    renewalType: string;
    noticePeriod?: string;
    yoyChange?: string;
    risk: string;
    usagePercent: number;
    purchasedSeats?: number;
    activeSeats?: number;
    possibleWaste?: string;
    cancelBy: string;
    daysToCancelBy: number;
    ownerStatus: "active" | "departed" | "unassigned";
    ownerName?: string;
    resolved: boolean;
  }>;
};

const money = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;

export function buildAiPortfolioFacts(entries: Array<{ slug: string; row: Renewal; resolved: boolean }>): AiPortfolioFacts {
  return {
    renewals: entries.map(({ row, resolved }) => {
      const unused = row.seats ? row.seats.purchased - row.seats.active : undefined;
      const perSeat = row.seats ? row.contractValue / row.seats.purchased : undefined;
      return {
        vendor: row.vendor,
        category: row.subtitle,
        contractValue: row.contractValue,
        renewalType: row.contractType,
        noticePeriod: `${row.noticeDays} days`,
        yoyChange: row.yoyPercent === undefined ? undefined : `${row.yoyPercent > 0 ? "+" : ""}${row.yoyPercent}%`,
        risk: row.risk,
        usagePercent: Number.parseInt(row.usage, 10) || 0,
        purchasedSeats: row.seats?.purchased,
        activeSeats: row.seats?.active,
        possibleWaste: unused !== undefined && perSeat !== undefined ? money(perSeat * unused) : undefined,
        cancelBy: row.cancelBy,
        daysToCancelBy: row.daysToCancelBy,
        ownerStatus: row.ownerStatus,
        ownerName: row.owner ?? undefined,
        resolved,
      };
    }),
  };
}

export function isAiPortfolioFacts(value: unknown): value is AiPortfolioFacts {
  if (!value || typeof value !== "object") return false;
  const renewals = (value as { renewals?: unknown }).renewals;
  return Array.isArray(renewals) && renewals.length > 0 && renewals.length <= 50 && renewals.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.vendor === "string" && row.vendor.length > 0 && row.vendor.length <= 100 &&
      typeof row.category === "string" && row.category.length <= 100 &&
      typeof row.contractValue === "number" && Number.isFinite(row.contractValue) && row.contractValue >= 0 &&
      typeof row.renewalType === "string" && row.renewalType.length <= 30 &&
      (row.noticePeriod === undefined || (typeof row.noticePeriod === "string" && row.noticePeriod.length <= 30)) &&
      (row.yoyChange === undefined || (typeof row.yoyChange === "string" && row.yoyChange.length <= 30)) &&
      ["Critical", "High", "Medium", "Low"].includes(row.risk as string) &&
      typeof row.usagePercent === "number" && Number.isFinite(row.usagePercent) && row.usagePercent >= 0 && row.usagePercent <= 100 &&
      (row.purchasedSeats === undefined || (typeof row.purchasedSeats === "number" && Number.isInteger(row.purchasedSeats) && row.purchasedSeats >= 0)) &&
      (row.activeSeats === undefined || (typeof row.activeSeats === "number" && Number.isInteger(row.activeSeats) && row.activeSeats >= 0)) &&
      (row.possibleWaste === undefined || (typeof row.possibleWaste === "string" && row.possibleWaste.length <= 30)) &&
      typeof row.cancelBy === "string" && row.cancelBy.length <= 30 &&
      typeof row.daysToCancelBy === "number" && Number.isInteger(row.daysToCancelBy) &&
      ["active", "departed", "unassigned"].includes(row.ownerStatus as string) &&
      (row.ownerName === undefined || (typeof row.ownerName === "string" && row.ownerName.length <= 100)) &&
      typeof row.resolved === "boolean";
  });
}

export function pickAiPortfolioFacts(facts: AiPortfolioFacts): AiPortfolioFacts {
  return {
    renewals: facts.renewals.map((row) => ({
      vendor: row.vendor,
      category: row.category,
      contractValue: row.contractValue,
      renewalType: row.renewalType,
      noticePeriod: row.noticePeriod,
      yoyChange: row.yoyChange,
      risk: row.risk,
      usagePercent: row.usagePercent,
      purchasedSeats: row.purchasedSeats,
      activeSeats: row.activeSeats,
      possibleWaste: row.possibleWaste,
      cancelBy: row.cancelBy,
      daysToCancelBy: row.daysToCancelBy,
      ownerStatus: row.ownerStatus,
      ownerName: row.ownerName,
      resolved: row.resolved,
    })),
  };
}
