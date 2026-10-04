import type { Renewal } from "./types";

export type MetricKey = "decision30" | "dueWeek" | "noOwner" | "pastDeadline";

/** A Figma-exported card icon and its inset inside the 20px box, from the design. */
export type MetricIcon = { src: string; outer: string };

export type RenewalMetric = {
  key: MetricKey;
  icon: MetricIcon;
  label: string;
  value: string;
  detail: string;
  count: number;
  tone?: "danger";
  /** Vendor logos for the renewals behind the number, shown in place of the detail line. */
  logos?: { name: string; src: string }[];
};

type AssessedEntry = { row: Renewal; resolved: boolean };

const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const icon = (name: string, outer: string): MetricIcon => ({ src: `/assets/figma/v2/${name}`, outer });

type MetricDef = {
  key: MetricKey;
  icon: MetricIcon;
  label: string;
  isDollar: boolean;
  tone?: "danger";
  match: (entry: AssessedEntry) => boolean;
  /** The line under the number. `names` are the vendors behind it. */
  detail: (count: number, names: string[]) => string;
  withLogos?: boolean;
};

// Each card's number is derived live from the same renewals the table shows,
// so a card can never claim a count the table can't back up — and doubles as
// a filter predicate for that table.
const metricDefs: MetricDef[] = [
  {
    key: "decision30",
    icon: icon("imgElements4.svg", "inset-[5.21%]"),
    label: "Open decisions, next 30 days",
    isDollar: true,
    match: (entry) => !entry.resolved && entry.row.daysToCancelBy >= 0 && entry.row.daysToCancelBy <= 30,
    detail: (count) => plural(count, "contract"),
  },
  {
    key: "dueWeek",
    icon: icon("imgElements5.svg", "inset-[4.17%_5.21%_6.25%_5.21%]"),
    label: "Due this week",
    isDollar: true,
    match: (entry) => !entry.resolved && entry.row.daysToCancelBy >= 0 && entry.row.daysToCancelBy <= 7,
    detail: (count) => plural(count, "contract"),
    withLogos: true,
  },
  {
    key: "noOwner",
    icon: icon("imgElements6.svg", "inset-[5.21%_11.46%]"),
    label: "Without an active owner",
    isDollar: false,
    match: (entry) => entry.row.owner === null,
    detail: () => "",
    withLogos: true,
  },
  {
    key: "pastDeadline",
    icon: icon("imgElements7.svg", "inset-[10.42%_2.08%]"),
    label: "Past deadline",
    isDollar: true,
    tone: "danger",
    match: (entry) => !entry.resolved && entry.row.daysToCancelBy < 0,
    detail: (count) => `${plural(count, "contract")} · renews regardless`,
  },
];

export function matchesMetric(key: MetricKey, entry: AssessedEntry): boolean {
  return metricDefs.find((def) => def.key === key)?.match(entry) ?? true;
}

export function deriveMetrics(assessed: AssessedEntry[]): RenewalMetric[] {
  return metricDefs.map((def) => {
    const matches = assessed.filter((entry) => def.match(entry));
    const count = matches.length;
    const value = def.isDollar
      ? formatCurrency(matches.reduce((sum, entry) => sum + entry.row.contractValue, 0))
      : String(count);
    const logos = def.withLogos
      ? matches.map((entry) => ({ name: entry.row.vendor, src: entry.row.logo })).slice(0, 3)
      : undefined;
    return {
      key: def.key,
      icon: def.icon,
      label: def.label,
      value,
      detail: def.detail(count, [...matches].sort((a, b) => a.row.cancelByISO.localeCompare(b.row.cancelByISO)).map((entry) => entry.row.vendor)),
      count,
      tone: def.tone,
      logos,
    };
  });
}
