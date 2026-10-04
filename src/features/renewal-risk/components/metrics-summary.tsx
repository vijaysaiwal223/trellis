import type { MetricKey, RenewalMetric } from "../metrics";

import { MetricCard } from "./metric-card";

export function MetricsSummary({
  metrics,
  activeFilter,
  onSelectFilter,
}: {
  metrics: RenewalMetric[];
  activeFilter?: MetricKey | null;
  onSelectFilter?: (key: MetricKey) => void;
}) {
  return (
    <section className="flex w-full flex-nowrap items-start gap-[8px] px-[16px] py-[12px]">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.key}
          metric={metric}
          active={activeFilter === metric.key}
          onSelect={onSelectFilter ? () => onSelectFilter(metric.key) : undefined}
        />
      ))}
    </section>
  );
}
