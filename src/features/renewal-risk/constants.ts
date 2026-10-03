import type { BadgeColor, Risk } from "./types";

export const renewalTableHeaders = [
  "Vendor",
  "Risk",
  "Cancel-by",
  "Contract",
  "Owner",
  "Usage",
  "Next step",
  "Action",
];

export const riskColor: Record<Risk, BadgeColor> = {
  Critical: "red",
  Low: "green",
  Medium: "blue",
  High: "orange",
};

/** The internal decision target sits this many days before the notice deadline. */
export const DECISION_BUFFER_DAYS = 14;
