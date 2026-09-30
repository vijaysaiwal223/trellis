import { Text } from "@medusajs/ui";

import type { RenewalDetail } from "../types";

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <div className={`flex flex-1 flex-col gap-0.5 p-3 ${last ? "" : "border-r border-ui-border-base"}`}>
      <Text as="span" className="text-[16px] font-medium leading-5 tracking-[-0.16px] text-ui-fg-base">
        {value}
      </Text>
      <Text as="span" className="text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-subtle">
        {label}
      </Text>
    </div>
  );
}

export function SeatUtilizationChart({ detail }: { detail: RenewalDetail }) {
  const { plan } = detail;

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex items-center px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          Seat utilization
        </Text>
      </div>
      <div className="flex w-full flex-col gap-2 border-t border-ui-border-base bg-ui-bg-base px-3 py-4">
        <div className="h-6 w-full overflow-hidden rounded bg-ui-border-base">
          <div
            className="h-full rounded"
            style={{
              width: `${plan.usagePercent}%`,
              backgroundColor: "var(--color-ui-tag-green-icon)",
              backgroundImage:
                "repeating-linear-gradient(-45deg, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)",
            }}
          />
        </div>
        <div className="flex w-full items-center justify-between text-[14px] leading-5">
          <span className="flex items-center gap-1">
            <Text as="span" className="font-medium text-ui-fg-base">
              {plan.activeSeats}
            </Text>
            <Text as="span" className="text-ui-fg-subtle">
              active
            </Text>
          </span>
          <span className="flex items-center gap-1">
            <Text as="span" className="font-medium text-ui-fg-base">
              {plan.unusedSeats}
            </Text>
            <Text as="span" className="text-ui-fg-subtle">
              unused
            </Text>
          </span>
        </div>
      </div>
      <div className="flex w-full items-stretch border-t border-ui-border-base bg-ui-bg-base">
        <Stat value={String(plan.purchasedSeats)} label="Purchased seats" />
        <Stat value={String(plan.activeSeats)} label="Active seats" />
        <Stat value={`${plan.usagePercent}%`} label="Seat usage" />
        <Stat value={String(plan.unusedSeats)} label="Unused seats" />
        <Stat value={plan.possibleWaste} label="Possible waste" last />
      </div>
    </section>
  );
}
