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
    <section className="mt-6 flex w-full flex-nowrap gap-2">
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
