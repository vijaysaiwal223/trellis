import { people } from "@/config/people";

export type OwnerCandidate = {
  name: string;
  team: string;
  assignedRenewals: number;
  relatedRenewals: number;
};

export type OwnerRecommendationRequest = {
  vendor: string;
  category: string;
  daysToCancelBy: number;
  preferredNames: string[];
  candidates: OwnerCandidate[];
};

export type OwnerRecommendation = { name: string; reason: string };

export function describeOwner(facts: OwnerRecommendationRequest, person: OwnerCandidate): string {
  const related = person.relatedRenewals;
  if (related > 0) {
    return `${person.name} is in ${person.team} and owns ${related} other ${facts.category.toLowerCase()} renewal${related === 1 ? "" : "s"} in Trellis.`;
  }
  const listed = facts.preferredNames.includes(person.name) ? " is already listed as a candidate for this renewal and" : "";
  return `${person.name}${listed} is in ${person.team}. Trellis shows ${person.assignedRenewals} other renewal${person.assignedRenewals === 1 ? "" : "s"} assigned.`;
}

export function isOwnerRecommendationRequest(value: unknown): value is OwnerRecommendationRequest {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<OwnerRecommendationRequest>;
  return (
    typeof data.vendor === "string" && data.vendor.length > 0 && data.vendor.length <= 100 &&
    typeof data.category === "string" && data.category.length <= 100 &&
    typeof data.daysToCancelBy === "number" && Number.isFinite(data.daysToCancelBy) &&
    Array.isArray(data.preferredNames) && data.preferredNames.length <= people.length &&
    data.preferredNames.every((name) => typeof name === "string" && people.some((person) => person.name === name)) &&
    Array.isArray(data.candidates) && data.candidates.length > 0 && data.candidates.length <= people.length &&
    data.candidates.every((candidate) =>
      candidate && typeof candidate === "object" &&
      people.some((person) => person.name === candidate.name && person.team === candidate.team) &&
      Number.isInteger(candidate.assignedRenewals) && candidate.assignedRenewals >= 0 && candidate.assignedRenewals <= 100 &&
      Number.isInteger(candidate.relatedRenewals) && candidate.relatedRenewals >= 0 &&
      candidate.relatedRenewals <= candidate.assignedRenewals,
    ) &&
    new Set(data.candidates.map((candidate) => candidate.name)).size === data.candidates.length
  );
}

export function localOwnerRecommendation(facts: OwnerRecommendationRequest): OwnerRecommendation {
  const sorted = [...facts.candidates].sort((a, b) => {
    const preferenceA = facts.preferredNames.indexOf(a.name);
    const preferenceB = facts.preferredNames.indexOf(b.name);
    const scoreA = a.relatedRenewals * 3 - a.assignedRenewals + (preferenceA < 0 ? 0 : 4 - preferenceA);
    const scoreB = b.relatedRenewals * 3 - b.assignedRenewals + (preferenceB < 0 ? 0 : 4 - preferenceB);
    return scoreB - scoreA || a.name.localeCompare(b.name);
  });
  const person = sorted[0];
  return { name: person.name, reason: describeOwner(facts, person) };
}
