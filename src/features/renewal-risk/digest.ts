import type { RenewalResolution } from "@/lib/renewal-runtime-state";

import { renewalTask } from "./workflow";
import { isOpenStage, renewalStage, type RenewalStage } from "./stage";
import type { Renewal } from "./types";

export type DigestEntry = {
  row: Renewal;
  stage: RenewalStage;
  action: string;
  href: string;
};

export type Digest = {
  /** Open renewals whose cancel-by falls in the next 0–7 days. */
  dueThisWeek: DigestEntry[];
  /** Open renewals whose cancel-by has passed. They renew regardless. */
  pastDeadline: DigestEntry[];
  /** Open renewals whose cancel-by falls in days 8–30. */
  next30: DigestEntry[];
  /** Open renewals with nobody accountable, in any window. */
  withoutOwner: DigestEntry[];
  totals: {
    openCount: number;
    openValue: number;
    dueThisWeekValue: number;
    next30Value: number;
    pastDeadlineValue: number;
  };
};

const sum = (entries: DigestEntry[]) => entries.reduce((total, entry) => total + entry.row.contractValue, 0);
const byCancelBy = (a: DigestEntry, b: DigestEntry) => a.row.daysToCancelBy - b.row.daysToCancelBy;

/**
 * What finance needs to see this week, from the same stage and next-action
 * rules the queue uses. Handled renewals never appear.
 */
export function buildDigest(entries: { row: Renewal; resolution?: RenewalResolution }[]): Digest {
  const open: DigestEntry[] = entries
    .map(({ row, resolution }) => {
      const stage = renewalStage(row, resolution);
      const task = renewalTask(row, resolution);
      return { row, stage, action: task.action, href: task.href };
    })
    .filter((entry) => isOpenStage(entry.stage))
    .sort(byCancelBy);

  const pastDeadline = open.filter((entry) => entry.row.daysToCancelBy < 0);
  const dueThisWeek = open.filter((entry) => entry.row.daysToCancelBy >= 0 && entry.row.daysToCancelBy <= 7);
  const next30 = open.filter((entry) => entry.row.daysToCancelBy > 7 && entry.row.daysToCancelBy <= 30);
  const withoutOwner = open.filter((entry) => entry.stage === "no-owner");

  return {
    dueThisWeek,
    pastDeadline,
    next30,
    withoutOwner,
    totals: {
      openCount: open.length,
      openValue: sum(open),
      dueThisWeekValue: sum(dueThisWeek),
      next30Value: sum(next30),
      pastDeadlineValue: sum(pastDeadline),
    },
  };
}
