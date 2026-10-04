/**
 * The prototype's clock. Every deadline, nudge and KPI reads "now" from here
 * instead of `new Date()`, so the demo is pinned to one snapshot day and the
 * date logic can be tested at any instant.
 */
export const SNAPSHOT_INSTANT = "2026-10-05T12:00:00Z";

const LAST_STAMP_KEY = "trellis-clock-last-stamp";

let lastStampMs = 0;

/** The current instant: the snapshot day. */
export function now(): Date {
  return new Date(SNAPSHOT_INSTANT);
}

function readLast(): number {
  if (lastStampMs > 0) return lastStampMs;
  try {
    const saved = Number(window.localStorage.getItem(LAST_STAMP_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
  } catch {
    // No storage (server render, private mode): fall back to in-memory ordering.
  }
  return 0;
}

/**
 * An audit timestamp. The demo is frozen on one day, so recorded events are
 * stamped on that day, one second apart: they stay strictly ordered across page
 * reloads without drifting out of the snapshot day.
 */
export function stamp(): string {
  const base = new Date(SNAPSHOT_INSTANT).getTime();
  const next = Math.max(readLast() + 1000, base);
  lastStampMs = next;
  try {
    window.localStorage.setItem(LAST_STAMP_KEY, String(next));
  } catch {
    // Ordering still holds in memory for this page load.
  }
  return new Date(next).toISOString();
}
