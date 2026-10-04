import { clx } from "@medusajs/ui";

import type { RenewalMetric } from "../metrics";

import { FigmaIcon } from "@/components/layout/figma-icon";

export function MetricCard({
  metric,
  active,
  onSelect,
}: {
  metric: RenewalMetric;
  active?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={clx(
        "flex min-w-px flex-1 items-start gap-[12px] overflow-clip rounded-[12px] border border-solid p-[10px] text-left transition-colors",
        active
          ? "border-ui-bg-interactive bg-ui-bg-interactive-soft"
          : "border-[#e4e4e7] bg-[#fafafa] hover:bg-[#f4f4f5]",
      )}
    >
      <span className="relative size-[20px] shrink-0">
        <FigmaIcon src={metric.icon.src} outer={metric.icon.outer} />
      </span>
      <span className="flex min-w-px flex-1 flex-col items-start gap-[6px]">
        <span className="whitespace-nowrap text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">{metric.label}</span>
        <span
          className={clx(
            "whitespace-nowrap font-heading text-[20px] font-semibold leading-[28px] tracking-[-0.05px]",
            metric.tone === "danger" ? "text-[#e11d48]" : "text-[#18181b]",
          )}
        >
          {metric.value}
        </span>
        {metric.logos ? (
          <span className="flex isolate items-center">
            {metric.logos.map((logo, index) => (
              <span
                key={logo.name}
                title={logo.name}
                className="relative mr-[-4px] flex size-[18px] items-center justify-center overflow-clip rounded-full bg-white p-px shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]"
                style={{ zIndex: 3 - index }}
              >
                {logo.src ? (
                  <img alt="" className="size-full rounded-full object-cover" src={logo.src} />
                ) : null}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-[12px] leading-[20px] tracking-[-0.03px] text-[#71717a]">{metric.detail}</span>
        )}
      </span>
    </button>
  );
}
