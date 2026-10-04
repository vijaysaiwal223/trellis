import { dayMonth, dayMonthYear } from "@/lib/dates";

import { addMonths, daysBetween, type ISODate } from "../deadlines";
import type { Renewal } from "../types";

/** Assumed term: the data has no contract start, so a renewal is taken to cover the twelve months before it. */
const TERM_MONTHS = 12;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * The contract as one line: time in use, the window to cancel, and the locked-in
 * period after the notice deadline. The notice deadline and today are marked on the
 * line; the dates are spelled out beneath it, which fits a narrow drawer.
 */
export function DeadlineTimeline({ row, today }: { row: Renewal; today: ISODate }) {
  const start = addMonths(row.renewalDate, -TERM_MONTHS);
  const span = Math.max(1, daysBetween(start, row.renewalDate));
  const at = (iso: ISODate) => clamp((daysBetween(start, iso) / span) * 100);

  const cancelBy = row.cancelByISO;
  const canStillCancel = daysBetween(today, cancelBy) > 0;
  const inUseEnd = canStillCancel ? today : cancelBy;
  const monthsInUse = Math.max(0, Math.round(daysBetween(start, inUseEnd) / 30.4));

  const inUseWidth = at(inUseEnd);
  const cancelWidth = canStillCancel ? at(cancelBy) - at(today) : 0;
  const lockedFrom = canStillCancel ? at(cancelBy) : at(today);

  return (
    <div className="flex w-full flex-col gap-[6px] text-[12px] leading-[16px] text-[#18181b]">
      <div className="relative h-[34px]">
        <div className="absolute bottom-0 flex flex-col items-end" style={{ right: `${100 - at(cancelBy)}%` }}>
          <span className="whitespace-nowrap font-medium tracking-[-0.06px]">{`Notice deadline ${dayMonth(cancelBy)}`}</span>
          <span className="h-[8px] w-px bg-[#71717a]" />
        </div>
      </div>

      <div className="relative flex h-[16px] w-full overflow-hidden rounded-[6px] border border-solid border-[#e4e4e7]">
        <div className="h-full bg-[#f4f4f5]" style={{ width: `${inUseWidth}%` }} />
        {canStillCancel ? <div className="h-full border-x border-solid border-[#6ee7b7] bg-[#d1fae5]" style={{ width: `${cancelWidth}%` }} /> : null}
        <div className="h-full border-l border-solid border-[#fda4af] bg-[#ffe4e6]" style={{ width: `${100 - lockedFrom}%` }} />
        <span aria-hidden className="absolute inset-y-0 w-px bg-[#18181b]" style={{ left: `${at(today)}%` }} />
      </div>

      <div className="relative h-[34px]">
        <div className="absolute top-0 flex flex-col items-end" style={{ right: `${100 - at(today)}%` }}>
          <span className="h-[8px] w-px bg-[#18181b]" />
          <span className="whitespace-nowrap font-medium tracking-[-0.06px]">{`Today ${dayMonth(today)}`}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-[4px] text-[#52525b]">
        <li className="flex items-center gap-[6px]">
          <span className="size-[8px] shrink-0 rounded-full bg-[#a1a1aa]" />
          {`${monthsInUse} month${monthsInUse === 1 ? "" : "s"} in use since ${dayMonthYear(start)}`}
        </li>
        {canStillCancel ? (
          <li className="flex items-center gap-[6px]">
            <span className="size-[8px] shrink-0 rounded-full bg-[#10b981]" />
            {`Can still cancel until ${dayMonthYear(cancelBy)}`}
          </li>
        ) : null}
        <li className="flex items-center gap-[6px]">
          <span className="size-[8px] shrink-0 rounded-full bg-[#f43f5e]" />
          {`Locked in, renews ${dayMonthYear(row.renewalDate)} for ${row.contractAmount}`}
        </li>
      </ul>
    </div>
  );
}
