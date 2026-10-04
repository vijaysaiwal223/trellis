/**
 * Pure calendar-date math for renewal deadlines.
 *
 * Dates are plain "YYYY-MM-DD" strings so the arithmetic never depends on the
 * machine's timezone. Only `calendarDateIn` touches time zones: it answers
 * "what is today's date in the org's timezone?" for a given instant.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;

function parts(iso: ISODate) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function epochDay(iso: ISODate): number {
  const { y, m, d } = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromEpochDay(n: number): ISODate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parts(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromEpochDay(epochDay(iso) + days);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return epochDay(to) - epochDay(from);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Adds calendar months, clamping to the month's last day (Jan 31 + 1 → Feb 28/29). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const day = Math.min(d, daysInMonth(ny, nm));
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The calendar date at `instant` in an IANA timezone (e.g. "America/Los_Angeles"). */
export function calendarDateIn(instant: Date, timeZone: string): ISODate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: ISODate): number {
  return new Date(epochDay(iso) * DAY_MS).getUTCDay();
}

export function isWeekend(iso: ISODate): boolean {
  const day = dayOfWeek(iso);
  return day === 0 || day === 6;
}

export function isBusinessDay(iso: ISODate, holidays: readonly ISODate[] = []): boolean {
  return !isWeekend(iso) && !holidays.includes(iso);
}

export type RollResult = { date: ISODate; shifted: boolean; reason?: "weekend" | "holiday" };

/**
 * Internal deadlines move EARLIER, never later: a decision due on a weekend or
 * holiday is due the business day before, so there is always someone at work to
 * act on it.
 */
export function rollBackToBusinessDay(iso: ISODate, holidays: readonly ISODate[] = []): RollResult {
  let date = iso;
  let reason: RollResult["reason"];
  while (!isBusinessDay(date, holidays)) {
    reason ??= isWeekend(date) ? "weekend" : "holiday";
    date = addDays(date, -1);
  }
  return { date, shifted: date !== iso, reason };
}

/** Last day notice can be given: the renewal date minus the notice period. */
export function computeCancelBy(renewalDate: ISODate, noticeDays: number): ISODate {
  return addDays(renewalDate, -noticeDays);
}

/** Internal decision deadline: the notice deadline minus lead time, on a business day. */
export function computeDecideBy(cancelBy: ISODate, leadTimeDays: number, holidays: readonly ISODate[] = []): RollResult {
  return rollBackToBusinessDay(addDays(cancelBy, -leadTimeDays), holidays);
}

/**
 * The renewal date of the cycle that is still ahead of `today`. Cycles repeat
 * every `termMonths` from the original date (anchored, so month-ends don't
 * drift). Returns the passed dates too — a passed auto-renewal date is how a
 * "surprise renewal" is detected.
 */
export function currentCycle(renewalDate: ISODate, termMonths: number, today: ISODate) {
  const passed: ISODate[] = [];
  let k = 0;
  let date = renewalDate;
  while (daysBetween(today, date) < 0 && k < 600) {
    passed.push(date);
    k += 1;
    date = addMonths(renewalDate, k * termMonths);
  }
  return { renewalDate: date, passed };
}

export type DeadlineInput = {
  renewalDate: ISODate;
  noticeDays: number;
  leadTimeDays: number;
  holidays?: readonly ISODate[];
  today: ISODate;
  /** 1 = monthly, 12 = annual, 36 = multi-year. */
  termMonths?: number;
  /** Only auto-renewing contracts roll into a new cycle once the date passes. */
  autoRenews?: boolean;
};

export type Deadlines = {
  /** The cycle these deadlines belong to. */
  renewalDate: ISODate;
  cancelBy: ISODate;
  decideBy: ISODate;
  daysToCancelBy: number;
  daysToDecideBy: number;
  decideByShifted: boolean;
  decideByShiftReason?: "weekend" | "holiday";
  cancelByOnNonBusinessDay: boolean;
  /** Renewal dates that passed while the contract kept auto-renewing. */
  passedRenewals: ISODate[];
};

export function computeDeadlines(input: DeadlineInput): Deadlines {
  const holidays = input.holidays ?? [];
  const cycle =
    input.autoRenews === false || !input.termMonths
      ? { renewalDate: input.renewalDate, passed: [] as ISODate[] }
      : currentCycle(input.renewalDate, input.termMonths, input.today);

  const cancelBy = computeCancelBy(cycle.renewalDate, input.noticeDays);
  // With no lead time, decide-by is the vendor's notice date itself: it is not moved to a business day.
  const decide: RollResult =
    input.leadTimeDays > 0 ? computeDecideBy(cancelBy, input.leadTimeDays, holidays) : { date: cancelBy, shifted: false };

  return {
    renewalDate: cycle.renewalDate,
    cancelBy,
    decideBy: decide.date,
    daysToCancelBy: daysBetween(input.today, cancelBy),
    daysToDecideBy: daysBetween(input.today, decide.date),
    decideByShifted: decide.shifted,
    decideByShiftReason: decide.reason,
    cancelByOnNonBusinessDay: !isBusinessDay(cancelBy, holidays),
    passedRenewals: cycle.passed,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 18" — year is added only when it differs from the reference date's year. */
export function formatShortISO(iso: ISODate, referenceYear?: number): string {
  const { y, m, d } = parts(iso);
  const label = `${MONTHS[m - 1]} ${d}`;
  return referenceYear !== undefined && y !== referenceYear ? `${label}, ${y}` : label;
}

/** "Sep 30, 2027" — always with the year, for places that stand alone. */
export function formatLongISO(iso: ISODate): string {
  const { y } = parts(iso);
  return `${formatShortISO(iso)}, ${y}`;
}
