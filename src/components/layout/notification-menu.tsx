"use client";

import { IconButton, Text, clx } from "@medusajs/ui";
import { RiArrowRightSLine, RiNotification3Line } from "@remixicon/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { renewals, renewalTask, useAssessedRenewals, type Renewal } from "@/features/renewal-risk";
import type { RenewalTask, RenewalTaskLevel } from "@/features/renewal-risk/workflow";
import { formatShortISO } from "@/features/renewal-risk/deadlines";
import { useRenewalRuntime, type RenewalResolution } from "@/lib/renewal-runtime-state";

// Severity is a dot, not a wall of red text: red = missed or closing within a week,
// amber = past the decide-by date but still open, grey = coming up.
const SEVERITY: Record<RenewalTaskLevel, { dot: string; label: string }> = {
  lead: { dot: "bg-ui-tag-red-icon", label: "Urgent" },
  overdue: { dot: "bg-ui-tag-orange-icon", label: "Overdue" },
  soon: { dot: "bg-ui-tag-neutral-icon", label: "Coming up" },
  upcoming: { dot: "bg-ui-tag-neutral-icon", label: "Coming up" },
  done: { dot: "bg-ui-tag-green-icon", label: "Done" },
};

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

/** One vocabulary for time: what has closed, what is overdue, or what is next. */
function timeLine(row: Renewal, task: RenewalTask, resolution: RenewalResolution | undefined): string {
  if (row.daysToCancelBy < 0) return `Notice window closed ${days(-row.daysToCancelBy)} ago`;
  if (task.kind === "follow-up") {
    const when = resolution?.decision?.followUpBy;
    return when ? `Check back ${formatShortISO(when)}` : "Set a follow-up date";
  }
  if (row.daysToDecideBy < 0) return `Decide by ${row.decideBy} · ${days(-row.daysToDecideBy)} overdue`;
  if (row.daysToDecideBy <= 14) return `Decide by ${row.decideBy} · in ${days(row.daysToDecideBy)}`;
  return `Cancel-by ${row.cancelBy}`;
}

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const assessed = useAssessedRenewals(renewals);
  const { resolutions } = useRenewalRuntime();

  const alerts = useMemo(
    () =>
      assessed
        .map((entry) => ({ ...entry, resolution: resolutions[entry.slug], task: renewalTask(entry.row, resolutions[entry.slug]) }))
        .filter((entry) => entry.task.level === "lead" || entry.task.level === "overdue" || entry.task.level === "soon")
        .sort((a, b) => b.task.priority - a.task.priority),
    [assessed, resolutions],
  );

  return (
    <div className="relative">
      <IconButton
        type="button"
        variant="transparent"
        aria-label={`Notifications (${alerts.length})`}
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        className="!flex !size-8 !items-center !justify-center rounded-full !bg-ui-bg-base !shadow-borders-base hover:!bg-ui-bg-base-hover after:hidden"
      >
        <RiNotification3Line className="size-5 text-ui-fg-subtle" />
      </IconButton>
      {alerts.length > 0 ? (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ui-tag-red-icon px-1 text-[11px] font-bold leading-4 text-white">
          {alerts.length}
        </span>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-[38px] z-50 flex w-[360px] flex-col overflow-hidden rounded-[8px] bg-ui-bg-base shadow-elevation-flyout">
          <div className="border-b border-ui-border-base px-3 py-2">
            <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
              Needs your attention · {alerts.length}
            </Text>
          </div>
          {alerts.length === 0 ? (
            <Text as="p" className="px-3 py-4 text-[14px] leading-5 text-ui-fg-muted">
              Nothing needs attention right now.
            </Text>
          ) : (
            <ul className="flex max-h-[360px] flex-col divide-y divide-ui-border-base overflow-y-auto">
              {alerts.map(({ row, slug, task, resolution }) => {
                const severity = SEVERITY[task.level];
                return (
                  <li key={slug}>
                    <Link
                      href={task.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-ui-bg-subtle"
                    >
                      <span className={clx("mt-1.5 size-2 shrink-0 rounded-full", severity.dot)}>
                        <span className="sr-only">{severity.label}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-baseline justify-between gap-2">
                          <Text as="span" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">
                            {task.title}
                          </Text>
                          <Text as="span" className="shrink-0 text-[12px] font-medium leading-4 text-ui-fg-base">
                            {row.contractAmount}
                          </Text>
                        </span>
                        <Text as="span" className="truncate text-[12px] leading-4 text-ui-fg-subtle">
                          {row.vendor} · {timeLine(row, task, resolution)}
                        </Text>
                      </span>
                      <RiArrowRightSLine className="mt-1 size-4 shrink-0 text-ui-fg-muted group-hover:text-ui-fg-base" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="border-t border-ui-border-base px-3 py-2 text-[13px] font-medium text-ui-fg-interactive hover:bg-ui-bg-subtle"
          >
            View all in Renewal Risk
          </Link>
        </div>
      ) : null}
    </div>
  );
}
