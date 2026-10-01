import { Text } from "@medusajs/ui";

import type { RenewalDetail } from "../types";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const heightPercent = Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="relative flex h-full flex-1 items-end">
      <Text
        as="span"
        className="absolute left-0 right-0 text-center text-[11px] font-medium leading-4 text-ui-fg-base"
        style={{ bottom: `calc(${heightPercent}% + 4px)` }}
      >
        {value}
      </Text>
      <div className="w-full rounded-t-[3px]" style={{ height: `${heightPercent}%`, backgroundColor: color }} />
    </div>
  );
}

export function UsageTrendChart({ detail }: { detail: RenewalDetail }) {
  const { usageTrend } = detail;
  const maxSeats = Math.max(...usageTrend.flatMap((point) => [point.purchasedSeats, point.activeSeats]));

  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          Usage trend
        </Text>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-ui-tag-blue-border)" }} />
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
              Purchased seats
            </Text>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-ui-tag-green-icon)" }} />
            <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
              Active seats
            </Text>
          </span>
        </div>
      </div>
      <div className="flex w-full flex-1 items-end gap-3 overflow-x-auto border-t border-ui-border-base bg-ui-bg-base p-4 min-h-[200px]">
        {usageTrend.map((point) => (
          <div key={point.month} className="flex h-full min-w-[64px] flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end gap-1">
              <Bar value={point.purchasedSeats} max={maxSeats} color="var(--color-ui-tag-blue-border)" />
              <Bar value={point.activeSeats} max={maxSeats} color="var(--color-ui-tag-green-icon)" />
            </div>
            <Text as="span" className="shrink-0 text-[12px] leading-4 text-ui-fg-muted">
              {point.month}
            </Text>
          </div>
        ))}
      </div>
    </section>
  );
}
