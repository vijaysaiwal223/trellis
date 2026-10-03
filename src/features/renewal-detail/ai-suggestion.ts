import type { DecisionAction } from "./types";
import type { Renewal } from "@/features/renewal-risk/types";
import type { RenewalDetail } from "./types";

export type AiSuggestion = {
  action: DecisionAction;
  confidence: number;
  recommendation: string;
  reasoning: string;
};

export type AiSuggestionFacts = {
  vendor: string;
  category: string;
  contractValue?: string;
  renewalType?: string;
  noticePeriod?: string;
  yoyChange?: string;
  usagePercent: number;
  purchasedSeats: number;
  activeSeats: number;
  possibleWaste: string;
  cancelByDate?: string;
  daysToCancelBy?: number;
  riskTier?: string;
  ownerName?: string;
  ownerStatus: "active" | "departed" | "unassigned";
};

export function buildAiSuggestionFacts(
  detail: RenewalDetail,
  assessedRow: Renewal | undefined,
  currentOwnerName: string | undefined,
  ownerDeparted: boolean,
): AiSuggestionFacts {
  const field = (label: string) => detail.contactDetails.find((row) => row.label === label)?.value;
  return {
    vendor: detail.vendor,
    category: detail.subtitle,
    contractValue: field("Annual contract"),
    renewalType: field("Renewal type"),
    noticePeriod: field("Notice period"),
    yoyChange: field("YoY price change"),
    usagePercent: detail.plan.usagePercent,
    purchasedSeats: detail.plan.purchasedSeats,
    activeSeats: detail.plan.activeSeats,
    possibleWaste: detail.plan.possibleWaste,
    cancelByDate: detail.timeline.find((point) => point.label === "Cancel-by")?.date,
    daysToCancelBy: assessedRow?.daysToCancelBy,
    riskTier: assessedRow?.risk,
    ownerName: currentOwnerName,
    ownerStatus: currentOwnerName ? "active" : ownerDeparted || assessedRow?.ownerStatus === "departed" ? "departed" : "unassigned",
  };
}

export function isAiSuggestionFacts(value: unknown): value is AiSuggestionFacts {
  if (!value || typeof value !== "object") return false;
  const facts = value as Record<string, unknown>;
  const optionalString = (key: string) => facts[key] === undefined || typeof facts[key] === "string";
  return (
    typeof facts.vendor === "string" && facts.vendor.trim().length > 0 &&
    typeof facts.category === "string" &&
    ["contractValue", "renewalType", "noticePeriod", "yoyChange", "possibleWaste", "cancelByDate", "riskTier", "ownerName"].every(optionalString) &&
    typeof facts.possibleWaste === "string" &&
    typeof facts.usagePercent === "number" && Number.isFinite(facts.usagePercent) && facts.usagePercent >= 0 && facts.usagePercent <= 100 &&
    typeof facts.purchasedSeats === "number" && Number.isInteger(facts.purchasedSeats) && facts.purchasedSeats >= 0 &&
    typeof facts.activeSeats === "number" && Number.isInteger(facts.activeSeats) && facts.activeSeats >= 0 && facts.activeSeats <= facts.purchasedSeats &&
    (facts.daysToCancelBy === undefined || (typeof facts.daysToCancelBy === "number" && Number.isInteger(facts.daysToCancelBy))) &&
    ["active", "departed", "unassigned"].includes(facts.ownerStatus as string)
  );
}

/** Keep only the known renewal fields before including client input in a model prompt. */
export function pickAiSuggestionFacts(facts: AiSuggestionFacts): AiSuggestionFacts {
  return {
    vendor: facts.vendor,
    category: facts.category,
    contractValue: facts.contractValue,
    renewalType: facts.renewalType,
    noticePeriod: facts.noticePeriod,
    yoyChange: facts.yoyChange,
    usagePercent: facts.usagePercent,
    purchasedSeats: facts.purchasedSeats,
    activeSeats: facts.activeSeats,
    possibleWaste: facts.possibleWaste,
    cancelByDate: facts.cancelByDate,
    daysToCancelBy: facts.daysToCancelBy,
    riskTier: facts.riskTier,
    ownerName: facts.ownerName,
    ownerStatus: facts.ownerStatus,
  };
}

const actions: DecisionAction[] = ["Renew", "Right-size", "Cancel"];

export function isAiSuggestion(value: unknown): value is AiSuggestion {
  if (!value || typeof value !== "object") return false;
  const suggestion = value as Record<string, unknown>;
  return (
    actions.includes(suggestion.action as DecisionAction) &&
    typeof suggestion.confidence === "number" &&
    Number.isInteger(suggestion.confidence) &&
    suggestion.confidence >= 0 &&
    suggestion.confidence <= 100 &&
    typeof suggestion.recommendation === "string" &&
    suggestion.recommendation.trim().length > 0 &&
    typeof suggestion.reasoning === "string" &&
    suggestion.reasoning.trim().length > 0
  );
}
