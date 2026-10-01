import { Text } from "@medusajs/ui";

import type { RenewalDetail } from "../types";

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

// A light-to-brand blue ramp (oldest → newest) instead of flat grey bars —
// the rising saturation visually reinforces the YoY increase, not just the
// bar heights.
const BAR_COLORS = ["var(--color-ui-tag-blue-bg)", "var(--color-ui-tag-blue-icon)", "var(--color-ui-bg-interactive)"];

export function PaymentHistoryChart({ detail }: { detail: RenewalDetail }) {
  const { paymentHistory, contactDetails } = detail;
  const yoyChange = contactDetails.find((row) => row.label === "YoY price change")?.value;
  const maxAmount = Math.max(...paymentHistory.map((entry) => entry.amount));

  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          Payment history
        </Text>
        {yoyChange ? (
          <Text as="span" className="text-[12px] font-medium leading-4 text-ui-tag-orange-text">
            {yoyChange} YoY
          </Text>
        ) : null}
      </div>
      <div className="flex w-full flex-1 items-end gap-4 border-t border-ui-border-base bg-ui-bg-base p-4 min-h-[200px]">
        {paymentHistory.map((entry, index) => {
          const heightPercent = Math.max(8, Math.round((entry.amount / maxAmount) * 100));
          const isLatest = index === paymentHistory.length - 1;

          return (
            <div key={entry.period} className="flex h-full flex-1 flex-col items-center gap-2">
              <Text
                as="span"
                className={
                  isLatest
                    ? "text-[14px] font-bold leading-5 text-ui-fg-base"
                    : "text-[14px] font-medium leading-5 text-ui-fg-base"
                }
              >
                {formatCurrency(entry.amount)}
              </Text>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px]"
                  style={{ height: `${heightPercent}%`, backgroundColor: BAR_COLORS[index] ?? BAR_COLORS[0] }}
                />
              </div>
              <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">
                {entry.period}
              </Text>
            </div>
          );
        })}
      </div>
    </section>
  );
}
