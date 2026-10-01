import { Text, clx } from "@medusajs/ui";

import type { RenewalMetric } from "../metrics";

export function MetricCard({
  metric,
  active,
  onSelect,
}: {
  metric: RenewalMetric;
  active?: boolean;
  onSelect?: () => void;
}) {
  const Icon = metric.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={clx(
        "flex min-w-0 flex-1 basis-0 items-start gap-3 rounded-[12px] border p-2.5 text-left transition-colors",
        active
          ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
          : "border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-ui-fg-subtle" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Text
          as="div"
          className="truncate text-[14px] font-normal leading-5 tracking-[-0.07px] text-ui-fg-subtle"
        >
          {metric.label}
        </Text>
        <Text
          as="div"
          className="truncate font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base"
        >
          {metric.value}
        </Text>
        <Text
          as="div"
          className="truncate text-[14px] font-normal leading-5 tracking-[-0.03px] text-ui-fg-muted"
        >
          {metric.detail}
        </Text>
      </div>
    </button>
  );
}
