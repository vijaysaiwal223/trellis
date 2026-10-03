import type { RenewalResolution } from "@/lib/renewal-runtime-state";
import type { BadgeColor, Renewal } from "./types";
import { renewalTask, type RenewalTask } from "./workflow";

export type RenewalDisplay = {
  row: Renewal;
  slug: string;
  statusLabel: string;
  statusTone: BadgeColor;
  action: string;
  href: string;
  isUrgent: boolean;
  task: RenewalTask;
};

/** The table, board, priority queue and bell share the same next action. */
export function resolveRenewalDisplay(row: Renewal, resolution: RenewalResolution | undefined): RenewalDisplay {
  const task = renewalTask(row, resolution);
  return {
    row,
    slug: row.id,
    statusLabel: task.status,
    statusTone: task.statusTone,
    action: task.action,
    href: task.href,
    isUrgent: task.level === "lead" || task.level === "overdue",
    task,
  };
}
