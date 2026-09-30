import { Text } from "@medusajs/ui";

import type { RenewalDetail } from "../types";

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

export function PaymentHistoryChart({ detail }: { detail: RenewalDetail }) {
  const { paymentHistory, contactDetails } = detail;
  const yoyChange = contactDetails.find((row) => row.label === "YoY price change")?.value;
  const maxAmount = Math.max(...paymentHistory.map((entry) => entry.amount));

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex items-center justify-between px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          Payment history
        </Text>
        {yoyChange ? (
          <Text as="span" className="text-[12px] font-medium leading-4 text-ui-tag-orange-text">
            {yoyChange} YoY
          </Text>
        ) : null}
      </div>
      <div className="flex w-full items-end gap-4 border-t border-ui-border-base bg-ui-bg-base p-4">
        {paymentHistory.map((entry) => {
          const heightPercent = Math.max(8, Math.round((entry.amount / maxAmount) * 100));
          const isLatest = entry === paymentHistory[paymentHistory.length - 1];

          return (
            <div key={entry.period} className="flex flex-1 flex-col items-center gap-2">
              <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                {formatCurrency(entry.amount)}
              </Text>
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-t-[4px]"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: isLatest
                      ? "var(--color-ui-bg-interactive)"
                      : "var(--color-ui-border-strong)",
                  }}
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
