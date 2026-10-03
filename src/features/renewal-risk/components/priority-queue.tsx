"use client";

import { Avatar, Text, clx } from "@medusajs/ui";
import { RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";

import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { resolveRenewalDisplay } from "../resolve-display";
import type { Renewal } from "../types";

export function PriorityQueue({ items }: { items: { slug: string; row: Renewal }[] }) {
  const { resolutions } = useRenewalRuntime();
  const tasks = items
    .map(({ slug, row }) => resolveRenewalDisplay(row, resolutions[slug]))
    .filter(({ task }) => task.kind !== "done")
    .sort((a, b) => b.task.priority - a.task.priority);
  const leadCount = tasks.filter(({ task }) => task.level === "lead" || task.level === "overdue").length;

  return (
    <section aria-labelledby="next-actions-heading" className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-base p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="next-actions-heading" className="text-[15px] font-semibold leading-5 text-ui-fg-base">Next actions</h2>
          <span className="rounded-full bg-ui-bg-subtle-hover px-2 py-0.5 text-[11px] font-medium text-ui-fg-subtle">{tasks.length} open</span>
        </div>
        <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
          {leadCount > 0 ? `${leadCount} urgent or overdue · ` : ""}Owner by T−30 · decision by T−14 · lead review at T−7
        </Text>
      </div>
      {tasks.length === 0 ? (
        <Text as="p" className="py-3 text-[13px] text-ui-fg-subtle">Every renewal outcome has been confirmed.</Text>
      ) : (
        <div className="grid gap-2 lg:grid-cols-3">
          {tasks.slice(0, 3).map(({ row, task, slug }) => (
            <Link
              key={slug}
              href={task.href}
              className="group flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 outline-none hover:border-ui-border-strong hover:bg-ui-bg-subtle-hover focus-visible:ring-2 focus-visible:ring-ui-bg-interactive"
            >
              <div className="flex items-start gap-2.5">
                <Avatar src={row.logo} fallback={row.vendor.slice(0, 2).toUpperCase()} variant="squared" size="small" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Text as="span" className="truncate text-[13px] font-semibold leading-5 text-ui-fg-base">{row.vendor}</Text>
                    <Text as="span" className="shrink-0 text-[12px] font-medium text-ui-fg-base">{row.contractAmount}</Text>
                  </div>
                  <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">Cancel-by {row.cancelBy} · {row.owner ?? "Unassigned"}</Text>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <Text as="p" className="text-[13px] font-medium leading-4 text-ui-fg-base">{task.title}</Text>
                  <Text as="p" className={clx("mt-1 text-[12px] leading-4", task.level === "lead" || task.level === "overdue" ? "text-ui-fg-error" : "text-ui-fg-subtle")}>{task.due}</Text>
                </div>
                <RiArrowRightLine className="size-4 shrink-0 text-ui-fg-interactive group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
