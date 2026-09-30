import { Text, clx } from "@medusajs/ui";
import { Fragment } from "react";

import { Alert } from "@/components/ui/alert";

import type { RenewalDetail } from "../types";

const dotTone = {
  neutral: "bg-ui-border-strong",
  warning: "bg-ui-tag-orange-icon",
  danger: "bg-ui-tag-red-icon",
};

const segmentTone = {
  neutral: "bg-ui-border-base",
  warning: "bg-ui-tag-orange-icon",
  danger: "bg-ui-tag-red-icon",
};

const segmentDashColor = {
  neutral: "var(--color-ui-border-strong)",
  warning: "var(--color-ui-tag-orange-icon)",
  danger: "var(--color-ui-tag-red-icon)",
};

export function RenewalTimeline({ detail }: { detail: RenewalDetail }) {
  const todayIndex = detail.timeline.findIndex((point) => point.label === "Today");
  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex items-center px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          Renewal timeline
        </Text>
      </div>
      <div className="flex w-full flex-col items-center gap-6 border-t border-ui-border-base bg-ui-bg-base p-3">
        <div className="flex w-full items-start justify-between text-center">
          {detail.timeline.map((point) => (
            <div key={point.label} className="flex w-[120px] flex-col items-center justify-center">
              <Text as="span" className="text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-subtle">
                {point.label}
              </Text>
              <Text as="span" className="text-[16px] font-medium leading-5 tracking-[-0.16px] text-ui-fg-base">
                {point.date}
              </Text>
            </div>
          ))}
        </div>
        <div className="flex w-full items-center px-12">
          {detail.timeline.map((point, index) => {
            const isToday = point.label === "Today";
            return (
              <Fragment key={point.label}>
                <span className="relative flex size-4 shrink-0 items-center justify-center">
                  {isToday ? (
                    <span
                      className={clx(
                        "absolute inline-flex size-4 animate-ping rounded-full opacity-60",
                        dotTone[point.tone],
                      )}
                    />
                  ) : null}
                  <span className={clx("relative size-4 shrink-0 rounded-full", dotTone[point.tone])} />
                </span>
                {index < detail.timelineSegments.length ? (
                  todayIndex !== -1 && index >= todayIndex ? (
                    <span
                      className="timeline-flow h-0.5 flex-1"
                      style={{
                        backgroundImage: `repeating-linear-gradient(to right, ${segmentDashColor[detail.timelineSegments[index]]} 0 8px, transparent 8px 16px)`,
                        backgroundSize: "16px 100%",
                      }}
                    />
                  ) : (
                    <span
                      className={clx("h-0.5 flex-1", segmentTone[detail.timelineSegments[index]])}
                    />
                  )
                ) : null}
              </Fragment>
            );
          })}
        </div>
        <Alert tone="info">
          <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
            {detail.timelineNote}
          </Text>
        </Alert>
      </div>
    </section>
  );
}
