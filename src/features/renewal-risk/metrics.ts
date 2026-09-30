import { iconPath } from "@/lib/assets";

import type { Renewal } from "./types";

export type MetricKey = "decision" | "lowUsage" | "autoRenew" | "cancelBy30" | "missingOwner";

export type RenewalMetric = {
  key: MetricKey;
  icon: string;
  label: string;
  value: string;
  detail: string;
  count: number;
};

type AssessedEntry = { row: Renewal; resolved: boolean };

const formatCompactCurrency = (amount: number) => `$${Math.round(amount / 1000)}k`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

type MetricDef = {
  key: MetricKey;
  icon: string;
  label: string;
  isDollar: boolean;
  match: (entry: AssessedEntry) => boolean;
  detail: (count: number) => string;
};

// Each card's number is derived live from the same renewals the table shows,
// so a card can never claim a count the table can't back up — and doubles as
// a filter predicate for that table.
const metricDefs: MetricDef[] = [
  {
    key: "decision",
    icon: iconPath("metric-dollar"),
    label: "Total exposure at risk",
    isDollar: true,
    match: (entry) => !entry.resolved,
    detail: (count) => `${plural(count, "renewal")} need a decision`,
  },
  {
    key: "lowUsage",
    icon: iconPath("metric-bank"),
    label: "Renewals under 80% usage",
    isDollar: true,
    match: (entry) => (parseInt(entry.row.usage, 10) || 0) < 80,
    detail: (count) => `${plural(count, "renewal")} under 80% usage`,
  },
  {
    key: "autoRenew",
    icon: iconPath("metric-timer"),
    label: "Renewing automatically",
    isDollar: false,
    match: (entry) => entry.row.contractType === "Auto-renew" && !entry.resolved,
    detail: () => "Renew unless someone acts",
  },
  {
    key: "cancelBy30",
    icon: iconPath("metric-alert"),
    label: "Cancel-by within 30 days",
    isDollar: false,
    match: (entry) => entry.row.daysToCancelBy <= 30,
    detail: (count) => `${plural(count, "cancel-by date")} in next 30 days`,
  },
  {
    key: "missingOwner",
    icon: iconPath("metric-users"),
    label: "Missing owners",
    isDollar: false,
    match: (entry) => entry.row.owner === null,
    detail: () => "No accountable owner assigned",
  },
];

export function matchesMetric(key: MetricKey, entry: AssessedEntry): boolean {
  return metricDefs.find((def) => def.key === key)?.match(entry) ?? true;
}

export function deriveMetrics(assessed: AssessedEntry[]): RenewalMetric[] {
  return metricDefs.map((def) => {
    const matches = assessed.filter(def.match);
    const count = matches.length;
    const value = def.isDollar
      ? formatCompactCurrency(matches.reduce((sum, entry) => sum + entry.row.contractValue, 0))
      : String(count);
    return { key: def.key, icon: def.icon, label: def.label, value, detail: def.detail(count), count };
  });
}
