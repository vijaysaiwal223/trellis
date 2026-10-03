import { formatShortISO } from "@/features/renewal-risk/deadlines";
import type { Renewal } from "@/features/renewal-risk/types";

import type { RenewalDetail, TimelinePoint, TimelineTone } from "./types";

const toneRank: Record<TimelineTone, number> = { neutral: 0, warning: 1, danger: 2 };

const windowTone = (days: number): TimelineTone => (days < 0 ? "danger" : days <= 7 ? "warning" : "neutral");

/**
 * The renewal timeline computed from the live deadlines rather than the
 * hand-written strings on the fixture: decide-by, today, cancel-by and the
 * renewal date, in date order. Falls back to the fixture's own timeline when
 * Renewal Decisions is off.
 */
export function liveTimeline(row: Renewal, today: string, decided: boolean): Pick<RenewalDetail, "timeline" | "timelineSegments" | "timelineNote"> {
  const year = Number(today.slice(0, 4));
  const points: { label: string; iso: string; tone: TimelineTone }[] = [
    { label: "Decide by", iso: row.decideByISO, tone: decided ? "neutral" : windowTone(row.daysToDecideBy) },
    { label: "Today", iso: today, tone: windowTone(row.daysToCancelBy) },
    { label: "Cancel-by", iso: row.cancelByISO, tone: windowTone(row.daysToCancelBy) },
    { label: "Renewal date", iso: row.renewalDate, tone: "neutral" },
  ];
  // Stable sort: on a tie "Today" stays after "Decide by".
  const sorted = [...points].sort((a, b) => a.iso.localeCompare(b.iso));
  const timeline: TimelinePoint[] = sorted.map((point) => ({
    label: point.label,
    date: formatShortISO(point.iso, year),
    tone: point.tone,
  }));
  const timelineSegments = sorted.slice(0, -1).map((point, index) =>
    toneRank[point.tone] >= toneRank[sorted[index + 1].tone] ? point.tone : sorted[index + 1].tone,
  );

  const timelineNote =
    row.daysToCancelBy < 0
      ? `The notice window closed ${-row.daysToCancelBy} day${row.daysToCancelBy === -1 ? "" : "s"} ago. Anything now needs the vendor's agreement.`
      : decided
        ? `Decision recorded. Cancel-by is ${row.cancelBy}.`
        : row.daysToDecideBy < 0
          ? `Decide-by (${row.decideBy}) has passed — ${-row.daysToDecideBy} day${row.daysToDecideBy === -1 ? "" : "s"} overdue. Cancel-by is ${row.cancelBy}.`
          : `Decide by ${row.decideBy}, ${row.leadTimeDays} days before the notice deadline. The deadline that bites is cancel-by (${row.cancelBy}), not the renewal date.`;

  return { timeline, timelineSegments, timelineNote };
}
