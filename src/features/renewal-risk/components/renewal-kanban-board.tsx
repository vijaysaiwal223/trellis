"use client";

import { Avatar, Text, clx } from "@medusajs/ui";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { matchesMetric, type MetricKey } from "../metrics";
import { resolveRenewalDisplay } from "../resolve-display";
import type { BadgeColor, RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";
import type { RenewalTaskLevel } from "../workflow";

import { RiskBadge } from "./risk-badge";

const toneDot: Record<BadgeColor, string> = {
  red: "bg-ui-tag-red-icon",
  orange: "bg-ui-tag-orange-icon",
  blue: "bg-ui-tag-blue-icon",
  grey: "bg-ui-tag-neutral-icon",
  green: "bg-ui-tag-green-icon",
  purple: "bg-ui-tag-purple-icon",
};

const columns: { level: RenewalTaskLevel; tone: BadgeColor; title: string }[] = [
  { level: "lead", tone: "red", title: "Lead attention" },
  { level: "overdue", tone: "orange", title: "Overdue" },
  { level: "soon", tone: "blue", title: "Due soon" },
  { level: "upcoming", tone: "grey", title: "Upcoming" },
  { level: "done", tone: "green", title: "Confirmed" },
];

type RenewalKanbanBoardProps = {
  renewals: RenewalSeed[];
  filterKey?: MetricKey | null;
};

export function RenewalKanbanBoard({ renewals, filterKey }: RenewalKanbanBoardProps) {
  const { resolutions } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const scoped = filterKey ? assessed.filter((entry) => matchesMetric(filterKey, entry)) : assessed;

  const displays = scoped
    .map((entry) => resolveRenewalDisplay(entry.row, resolutions[entry.slug]))
    .sort((a, b) => b.task.priority - a.task.priority);

  return (
    <div className="mt-6 flex w-full items-start gap-3 overflow-x-auto pb-2">
      {columns.map((column) => {
        const cards = displays.filter((display) => display.task.level === column.level);
        return (
          <div
            key={column.level}
            className="flex min-w-[260px] flex-1 flex-col gap-2 rounded-[12px] border border-ui-border-base bg-ui-bg-subtle p-2"
          >
            <div className="flex items-center gap-2 px-1 py-1">
              <span className={clx("size-2 shrink-0 rounded-full", toneDot[column.tone])} />
              <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
                {column.title}
              </Text>
              <Text as="span" className="text-[12px] text-ui-fg-muted">
                {cards.length}
              </Text>
            </div>

            <div className="flex flex-col gap-2">
              {cards.length === 0 ? (
                <Text as="p" className="px-1 py-2 text-[12px] text-ui-fg-muted">
                  Nothing here.
                </Text>
              ) : (
                cards.map(({ row, slug, statusLabel, action, href, isUrgent, task }) => (
                  <div
                    key={slug}
                    className="flex flex-col gap-2 rounded-[8px] border border-ui-border-base bg-ui-bg-base p-3 "
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={row.logo} fallback={row.vendor.slice(0, 2).toUpperCase()} variant="squared" size="small" />
                      <div className="flex min-w-0 flex-col">
                        <Text as="span" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">
                          {row.vendor}
                        </Text>
                        <Text as="span" className="truncate text-[12px] leading-4 text-ui-fg-subtle">
                          {row.subtitle}
                        </Text>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <RiskBadge risk={row.risk} />
                      <Text
                        as="span"
                        className={clx(
                          "text-[12px] font-medium leading-4",
                          row.timingTone === "danger"
                            ? "text-ui-fg-error"
                            : row.timingTone === "warning"
                              ? "text-ui-tag-orange-text"
                              : "text-ui-fg-subtle",
                        )}
                      >
                        {row.cancelBy} · {row.timing}
                      </Text>
                    </div>

                    <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                      {row.contractAmount}
                    </Text>

                    <Text
                      as="span"
                      className={clx("truncate text-[12px] leading-4", row.owner ? "text-ui-fg-subtle" : "text-ui-fg-error")}
                    >
                      {row.owner ? `${row.owner}${row.team ? ` · ${row.team}` : ""}` : "Unassigned"}
                    </Text>

                    <Text as="span" className="truncate text-[12px] font-medium leading-4 text-ui-fg-base">
                      {statusLabel}
                    </Text>

                    <div className="border-t border-ui-border-base pt-2">
                      <Text as="p" className="text-[12px] font-medium leading-4 text-ui-fg-base">{task.title}</Text>
                      <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">{task.due}</Text>
                    </div>

                    <Button asChild variant={isUrgent ? "primary" : "secondary"} size="small" className="w-full justify-center">
                      <Link href={href}>{action}</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
