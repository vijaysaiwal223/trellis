import { isValidISODate } from "./deadlines";
import type { NoticeSource } from "./decision-model";
import type { ContractType, RenewalSeed } from "./types";
import { toVendorSlug } from "@/lib/vendor-slug";

export type CsvError = { line: number; message: string };

export type CsvImportResult = {
  seeds: RenewalSeed[];
  errors: CsvError[];
  /** Rows skipped because the same vendor + renewal date already exists. */
  duplicates: { line: number; vendor: string }[];
};

/** Quote-aware split of one CSV line. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

const HEADER_ALIASES: Record<string, string> = {
  vendor: "vendor", name: "vendor", application: "vendor",
  renewal_date: "renewalDate", renewaldate: "renewalDate", renewal: "renewalDate",
  notice_days: "noticeDays", notice_period_days: "noticeDays", notice: "noticeDays",
  annual_value: "value", value: "value", contract_value: "value", amount: "value",
  currency: "currency", owner: "owner", decider: "decider", category: "category", team: "team",
  auto_renew: "autoRenew", autorenew: "autoRenew", term_months: "termMonths",
};

const TRUE = new Set(["yes", "y", "true", "1", "auto", "auto-renew"]);

/**
 * Turns a CSV of contracts into seeds. Bad rows are reported with their line
 * number, not silently dropped; a missing notice period is allowed (it becomes
 * a blind spot); the same vendor with a different renewal date is a second
 * contract, not a duplicate.
 */
export function parseContractsCsv(text: string, existing: readonly Pick<RenewalSeed, "id" | "vendor" | "renewalDate">[] = []): CsvImportResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const result: CsvImportResult = { seeds: [], errors: [], duplicates: [] };
  if (lines.length < 2) {
    result.errors.push({ line: 1, message: "Add a header row and at least one contract." });
    return result;
  }

  const headers = splitLine(lines[0]).map((header) => HEADER_ALIASES[header.toLowerCase().replace(/[\s-]+/g, "_")] ?? "");
  for (const required of ["vendor", "renewalDate", "value"]) {
    if (!headers.includes(required)) {
      result.errors.push({ line: 1, message: `Missing column: ${required === "renewalDate" ? "renewal_date" : required === "value" ? "annual_value" : required}.` });
    }
  }
  if (result.errors.length > 0) return result;

  const seen = new Set(existing.map((entry) => `${entry.vendor.toLowerCase()}|${entry.renewalDate}`));
  const usedIds = new Set(existing.map((entry) => entry.id ?? toVendorSlug(entry.vendor)));

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const cells = splitLine(line);
    const get = (key: string) => cells[headers.indexOf(key)]?.trim() ?? "";

    const vendor = get("vendor");
    const renewalDate = get("renewalDate");
    const value = Number(get("value").replace(/[$€£,\s]/g, ""));
    const noticeRaw = get("noticeDays");
    const notice = noticeRaw === "" ? null : Number(noticeRaw);

    const problems: string[] = [];
    if (!vendor) problems.push("vendor is empty");
    if (!isValidISODate(renewalDate)) problems.push(`renewal_date "${renewalDate}" is not a YYYY-MM-DD date`);
    if (!Number.isFinite(value) || value <= 0) problems.push("annual_value must be a positive number");
    if (notice !== null && (!Number.isInteger(notice) || notice < 0 || notice > 365)) problems.push("notice_days must be a whole number from 0 to 365");
    if (problems.length > 0) {
      result.errors.push({ line: lineNumber, message: problems.join("; ") });
      return;
    }

    const key = `${vendor.toLowerCase()}|${renewalDate}`;
    if (seen.has(key)) {
      result.duplicates.push({ line: lineNumber, vendor });
      return;
    }
    seen.add(key);

    let id = toVendorSlug(vendor);
    for (let n = 2; usedIds.has(id); n += 1) id = `${toVendorSlug(vendor)}-${n}`;
    usedIds.add(id);

    const owner = get("owner") || null;
    const decider = get("decider") || undefined;
    const autoRenews = get("autoRenew") === "" ? true : TRUE.has(get("autoRenew").toLowerCase());
    const contractType: ContractType = autoRenews ? "Auto-renew" : "Manual";
    const noticeSource: NoticeSource | undefined = notice === null ? undefined : "manual";

    result.seeds.push({
      id,
      vendor,
      subtitle: get("category") || "Imported",
      logo: "",
      renewalDate,
      noticePeriodDays: notice,
      noticeSource,
      termMonths: Number(get("termMonths")) || 12,
      currency: (get("currency") || "USD").toUpperCase(),
      contractValue: value,
      contractType,
      owner,
      decider,
      team: get("team") || null,
      vacancy: owner ? undefined : "unassigned",
      usage: "—",
      status: owner ? "Imported" : "Assign owner",
      statusTone: owner ? "grey" : "orange",
      action: owner ? "View" : "Assign",
    });
  });

  return result;
}
