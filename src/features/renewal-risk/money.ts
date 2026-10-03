/**
 * Money is never summed across currencies: there is no exchange-rate source,
 * so mixed portfolios report one subtotal per currency ("$1,862k + €120k")
 * rather than a number that would quietly be wrong.
 */
export const BASE_CURRENCY = "USD";

function symbolFor(currency: string): string {
  try {
    const part = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatMoney(amount: number, currency: string = BASE_CURRENCY): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

/** "$180k" — rounded to thousands, symbol of the currency. */
export function formatCompactMoney(amount: number, currency: string = BASE_CURRENCY): string {
  return `${symbolFor(currency)}${Math.round(amount / 1000)}k`;
}

export type CurrencyTotals = Record<string, number>;

export function sumByCurrency(items: { amount: number; currency?: string }[]): CurrencyTotals {
  const totals: CurrencyTotals = {};
  for (const item of items) {
    const currency = item.currency ?? BASE_CURRENCY;
    totals[currency] = (totals[currency] ?? 0) + item.amount;
  }
  return totals;
}

/** Largest subtotal first, joined with " + ". An empty portfolio is "$0k". */
export function formatTotals(totals: CurrencyTotals, compact = true): string {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return compact ? formatCompactMoney(0) : formatMoney(0);
  return entries
    .map(([currency, amount]) => (compact ? formatCompactMoney(amount, currency) : formatMoney(amount, currency)))
    .join(" + ");
}
