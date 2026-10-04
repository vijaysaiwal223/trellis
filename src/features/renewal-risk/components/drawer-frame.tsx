"use client";

import { RiCloseLine } from "@remixicon/react";
import type { ReactNode } from "react";

/** The shell every side drawer shares: vendor header, scrolling body, footer actions. */
export function DrawerFrame({
  logo,
  vendor,
  badge,
  subtitle,
  onClose,
  children,
  footer,
}: {
  logo?: string;
  vendor: string;
  badge?: ReactNode;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-center gap-[10px]">
          <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-white p-[2px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
            {logo ? (
              <img alt="" className="size-full rounded-[5px] object-cover" src={logo} />
            ) : (
              <span className="text-[12px] font-medium text-[#52525b]">{vendor.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <div className="flex flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">{vendor}</span>
              {badge}
            </div>
            {subtitle ? <span className="text-[13px] leading-[16px] text-[#52525b]">{subtitle}</span> : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] border border-solid border-[#e4e4e7] bg-[#fafafa] text-[#52525b] hover:bg-[#f4f4f5]"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      {footer ? (
        <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export const secondaryButton =
  "h-[32px] rounded-[8px] bg-white px-[10px] text-[14px] font-medium whitespace-nowrap text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5] disabled:opacity-40";
export const primaryButton =
  "h-[32px] rounded-[8px] bg-[#2876f5] px-[10px] text-[14px] font-medium whitespace-nowrap text-white shadow-[0px_0px_0px_1px_#0a5ce0] hover:bg-[#1f6be6] disabled:opacity-40";

/** The deadline bar used across drawers: how far through the cycle, with the three dates under it. */
export function DeadlineBar({
  today,
  decideBy,
  renews,
  fillPercent,
  tone = "blue",
}: {
  today: string;
  decideBy: string;
  renews: string;
  fillPercent: number;
  tone?: "blue" | "red";
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <div className={`flex h-[12px] w-full items-center overflow-clip rounded-[4px] ${tone === "red" ? "bg-[#ffe9ea]" : "bg-[#f4f4f5]"}`}>
        <div className="h-full rounded-[4px] bg-[#dae6fc]" style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }} />
      </div>
      <div className="flex w-full items-start justify-between text-center text-[12px] leading-[16px] whitespace-nowrap">
        <div className="flex flex-col items-center">
          <span className="text-[#52525b]">Today</span>
          <span className="font-medium text-[#18181b]">{today}</span>
        </div>
        <div className="flex flex-col items-center text-[#1e40af]">
          <span>Decide by</span>
          <span className="font-medium">{decideBy}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#52525b]">Renews</span>
          <span className="font-medium text-[#18181b]">{renews}</span>
        </div>
      </div>
    </div>
  );
}
