"use client";

import { IconButton, Text, clx } from "@medusajs/ui";
import { RiNotification3Line } from "@remixicon/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { renewals, renewalTask, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const assessed = useAssessedRenewals(renewals);
  const { resolutions } = useRenewalRuntime();

  const alerts = useMemo(
    () =>
      assessed
        .map((entry) => ({ ...entry, task: renewalTask(entry.row, resolutions[entry.slug]) }))
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
              Action queue · in-app reminders
            </Text>
          </div>
          {alerts.length === 0 ? (
            <Text as="p" className="px-3 py-4 text-[14px] leading-5 text-ui-fg-muted">
              No urgent renewal steps right now.
            </Text>
          ) : (
            <ul className="flex max-h-[360px] flex-col divide-y divide-ui-border-base overflow-y-auto">
              {alerts.map(({ row, slug, task }) => (
                <li key={slug}>
                  <Link
                    href={task.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-0.5 px-3 py-2.5 hover:bg-ui-bg-subtle"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                        {row.vendor}
                      </Text>
                      <Text
                        as="span"
                        className={clx(
                          "text-[12px] font-medium leading-4",
                          task.level === "lead" || task.level === "overdue"
                            ? "text-ui-fg-error"
                            : task.level === "soon"
                              ? "text-ui-tag-orange-text"
                              : "text-ui-fg-subtle",
                        )}
                      >
                        {task.due}
                      </Text>
                    </span>
                    <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                      {task.title} · {row.owner ?? "Unassigned"} · {row.contractAmount}
                    </Text>
                    {task.level === "lead" ? (
                      <Text as="span" className="text-[12px] font-medium leading-4 text-ui-tag-red-text">
                        Lead attention needed in Trellis
                      </Text>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
