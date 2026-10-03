import { describe, expect, it } from "vitest";

import { extractTerms } from "./extract";

describe("contract term extraction (upload → extract → confirm)", () => {
  const contract = `
    MASTER SUBSCRIPTION AGREEMENT
    1. Term. The initial term ends on December 1, 2026 and this Agreement shall automatically renew for successive one-year terms.
    2. Non-renewal. Either party may prevent renewal by giving sixty (60) days prior written notice before the end of the then-current term.
    3. Fees. Annual fees of $180,000 are payable net 30 days from invoice.
  `;

  it("reads the notice period, renewal date, value and auto-renewal, with sources", () => {
    const result = extractTerms(contract);
    expect(result.noticeDays?.value).toBe(60);
    expect(result.noticeDays?.excerpt).toContain("sixty (60) days prior written notice");
    expect(result.noticeDays?.confidence).toBeGreaterThanOrEqual(85);
    expect(result.renewalDate?.value).toBe("2026-12-01");
    expect(result.annualValue?.value).toBe(180_000);
    expect(result.autoRenews?.value).toBe(true);
    expect(result.conflicting).toBe(false);
  });

  it("does not mistake payment terms for the notice period", () => {
    const result = extractTerms("Invoices are payable net 30 days from the invoice date.");
    expect(result.noticeDays).toBeUndefined();
  });

  it("flags and downgrades conflicting notice periods", () => {
    const result = extractTerms(
      "Customer may give 30 days notice of termination for convenience. Non-renewal requires 90 days written notice.",
    );
    expect(result.conflicting).toBe(true);
    expect(result.noticeDays?.confidence).toBeLessThanOrEqual(55);
  });

  it("returns nothing for text with no terms rather than guessing", () => {
    expect(extractTerms("Thank you for your business.")).toEqual({ conflicting: false });
  });

  it("parses day-first and ISO dates", () => {
    expect(extractTerms("The agreement renews on 15 January 2027.").renewalDate?.value).toBe("2027-01-15");
    expect(extractTerms("Renewal date: 2027-03-31").renewalDate?.value).toBe("2027-03-31");
  });
});
