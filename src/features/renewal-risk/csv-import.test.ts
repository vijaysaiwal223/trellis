import { describe, expect, it } from "vitest";

import { parseContractsCsv } from "./csv-import";

const header = "vendor,renewal_date,notice_days,annual_value,currency,owner";

describe("CSV import", () => {
  it("imports valid rows, keeping a missing notice period as unknown", () => {
    const result = parseContractsCsv(`${header}\nAcme,2027-02-01,45,"12,000",EUR,Rohan Mehta\nBeta,2027-03-01,,5000,,`);
    expect(result.errors).toEqual([]);
    expect(result.seeds.map((seed) => [seed.vendor, seed.noticePeriodDays, seed.currency, seed.owner])).toEqual([
      ["Acme", 45, "EUR", "Rohan Mehta"],
      ["Beta", null, "USD", null],
    ]);
    expect(result.seeds[0].contractValue).toBe(12_000);
  });

  it("reports bad rows with their line number instead of dropping them silently", () => {
    const result = parseContractsCsv(`${header}\nAcme,01/02/2027,45,1000,,\nBeta,2027-03-01,45,abc,,`);
    expect(result.seeds).toEqual([]);
    expect(result.errors.map((error) => error.line)).toEqual([2, 3]);
  });

  it("skips exact duplicates of existing contracts", () => {
    const existing = [{ vendor: "Acme", renewalDate: "2027-02-01" }];
    const result = parseContractsCsv(`${header}\nacme,2027-02-01,45,1000,,`, existing);
    expect(result.seeds).toEqual([]);
    expect(result.duplicates).toEqual([{ line: 2, vendor: "acme" }]);
  });

  it("keeps the same vendor on a different date as a separate contract with its own id", () => {
    const result = parseContractsCsv(`${header}\nAcme,2027-02-01,45,1000,,\nAcme,2028-02-01,45,2000,,`);
    expect(result.seeds.map((seed) => seed.id)).toEqual(["acme", "acme-2"]);
  });

  it("rejects a file missing required columns", () => {
    expect(parseContractsCsv("name,foo\nAcme,1").errors[0].message).toContain("renewal_date");
  });
});
