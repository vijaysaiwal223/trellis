import { Text } from "@medusajs/ui";

import type { DetailRow } from "../types";

export function DetailListCard({
  id,
  title,
  rows,
}: {
  id?: string;
  title: string;
  rows: DetailRow[];
}) {
  return (
    <section
      id={id}
      className="flex w-full scroll-mt-4 flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle"
    >
      <div className="flex items-center px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          {title}
        </Text>
      </div>
      <div className="flex w-full flex-col divide-y divide-ui-border-base border-t border-ui-border-base bg-ui-bg-base">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-2">
            <Text as="span" className="text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-subtle">
              {row.label}
            </Text>
            {row.progress != null ? (
              <div className="flex w-[120px] items-center gap-2">
                <div className="h-2 flex-1 rounded-sm border border-ui-border-strong bg-ui-tag-neutral-bg">
                  <div
                    className="h-full rounded-sm bg-ui-tag-green-icon"
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
                <Text as="span" className="text-[14px] leading-5 tracking-[-0.105px] text-ui-fg-base">
                  {row.value}
                </Text>
              </div>
            ) : (
              <Text as="span" className="text-[14px] leading-5 tracking-[-0.105px] text-ui-fg-base">
                {row.value}
              </Text>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
