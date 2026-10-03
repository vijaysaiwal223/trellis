import { describe, expect, it } from "vitest";

import { formatCompactMoney, formatMoney, formatTotals, sumByCurrency } from "./money";

describe("multi-currency money (#40)", () => {
  it("formats USD exactly as the app always has", () => {
    expect(formatMoney(180_000)).toBe("$180,000");
    expect(formatCompactMoney(1_862_400)).toBe("$1862k");
  });

  it("formats other currencies with their own symbol", () => {
    expect(formatMoney(120_000, "EUR")).toBe("€120,000");
    expect(formatCompactMoney(120_000, "EUR")).toBe("€120k");
    expect(formatCompactMoney(90_000, "GBP")).toBe("£90k");
  });

  it("never merges currencies into one number", () => {
    const totals = sumByCurrency([
      { amount: 100_000 },
      { amount: 50_000, currency: "USD" },
      { amount: 120_000, currency: "EUR" },
    ]);
    expect(totals).toEqual({ USD: 150_000, EUR: 120_000 });
    expect(formatTotals(totals)).toBe("$150k + €120k");
  });

  it("falls back gracefully for an unknown currency code", () => {
    expect(formatMoney(5_000, "ZZZ9")).toContain("5,000");
  });

  it("reports an empty portfolio as zero", () => {
    expect(formatTotals({})).toBe("$0k");
  });
});
