"use client";

import { Avatar, StatusBadge, Table, Text } from "@medusajs/ui";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { resolveRenewalDisplay } from "../resolve-display";
import type { Renewal, Risk } from "../types";

import { RiskBadge } from "./risk-badge";
import { StackedCellText } from "./stacked-cell-text";

// A left accent on rows that actually need attention, so the eye can triage
// the queue without reading every risk badge one by one.
const riskAccent: Record<Risk, string> = {
  Critical: "var(--color-ui-tag-red-icon)",
  High: "var(--color-ui-tag-orange-icon)",
  Medium: "transparent",
  Low: "transparent",
};

function usageBarColor(percent: number) {
  if (percent >= 80) return "var(--color-ui-tag-green-icon)";
  if (percent >= 50) return "var(--color-ui-tag-orange-icon)";
  return "var(--color-ui-tag-red-icon)";
}

type RenewalRowProps = {
  row: Renewal;
};

export function RenewalRow({ row: baseRow }: RenewalRowProps) {
  const { resolutions } = useRenewalRuntime();
  const resolution = resolutions[toVendorSlug(baseRow.vendor)];
  const { row, slug, statusLabel, statusTone, action, isUrgent } = resolveRenewalDisplay(baseRow, resolution);
  const usagePercent = parseInt(row.usage, 10) || 0;

  return (
    <Table.Row
      className="[&_td]:h-16 [&_td]:!px-3 [&_td:first-child]:!pl-3 [&_td:last-child]:!pr-3"
      style={{ borderLeft: `3px solid ${riskAccent[row.risk]}` }}
    >
      <Table.Cell className="!w-[200px] gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={row.logo}
            fallback={row.vendor.slice(0, 2).toUpperCase()}
            variant="squared"
            size="large"
          />
          <StackedCellText primary={row.vendor} secondary={row.subtitle} />
        </div>
      </Table.Cell>
      <Table.Cell>
        <RiskBadge risk={row.risk} />
      </Table.Cell>
      <Table.Cell>
        <StackedCellText
          primary={row.cancelBy}
          secondary={row.timing}
          secondaryClassName={
            row.timingTone === "danger"
              ? "text-ui-fg-error"
              : row.timingTone === "warning"
                ? "text-ui-tag-orange-text"
                : "text-ui-fg-subtle"
          }
        />
      </Table.Cell>
      <Table.Cell>
        <StackedCellText
          primary={row.contractAmount}
          secondary={row.contractType}
        />
      </Table.Cell>
      <Table.Cell>
        <StackedCellText
          primary={row.owner ?? "Unassigned"}
          secondary={row.owner ? (row.team ?? "—") : row.ownerStatus === "departed" ? "Owner departed" : "No owner assigned"}
          secondaryClassName={row.owner ? "text-ui-fg-subtle" : "text-ui-fg-error"}
        />
      </Table.Cell>
      <Table.Cell>
        <div className="flex min-w-0 flex-col gap-2">
          <Text
            as="span"
            className="text-[14px] font-bold leading-5 text-ui-fg-base"
          >
            {row.usage}
          </Text>
          <div className="h-2 w-28 overflow-hidden rounded-[2px] border-[0.5px] border-ui-border-strong bg-ui-tag-neutral-bg">
            <div
              className="h-full"
              style={{ width: `${usagePercent}%`, backgroundColor: usageBarColor(usagePercent) }}
            />
          </div>
        </div>
      </Table.Cell>
      <Table.Cell>
        <StatusBadge color={statusTone} className="!h-7 max-w-full !text-[14px]">
          <span className="truncate">{statusLabel}</span>
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>
        <Button asChild variant={isUrgent ? "primary" : "secondary"} size="base">
          <Link href={`/renewals/${slug}`}>{action}</Link>
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}
