import { addDays, isValidISODate, type ISODate } from "./deadlines";

/**
 * A deliberately simple, rules-based reader for contract text. It finds the
 * notice period, renewal date and annual value, shows the sentence each came
 * from, and says how sure it is. It never fills a field it could not find, and
 * nothing it returns takes effect until a person confirms it.
 */
export type Extracted<T> = { value: T; excerpt: string; confidence: number };

export type ExtractionResult = {
  noticeDays?: Extracted<number>;
  renewalDate?: Extracted<ISODate>;
  annualValue?: Extracted<number>;
  autoRenews?: Extracted<boolean>;
  /** Several different notice periods appeared, so the first is a guess. */
  conflicting: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, "forty five": 45,
  fifty: 50, sixty: 60, seventy: 70, "seventy-five": 75, ninety: 90, "one hundred": 100,
  "one hundred twenty": 120, "one hundred eighty": 180,
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const pad = (n: number) => String(n).padStart(2, "0");

function sentenceAround(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf(".", index - 1), text.lastIndexOf("\n", index - 1)) + 1;
  const endDot = text.indexOf(".", index);
  const endLine = text.indexOf("\n", index);
  const ends = [endDot, endLine].filter((position) => position !== -1);
  const end = ends.length > 0 ? Math.min(...ends) : text.length;
  return text.slice(start, end + 1).trim().replace(/\s+/g, " ").slice(0, 240);
}

function noticeCandidates(text: string) {
  const found: Extracted<number>[] = [];
  const words = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join("|");
  // "ninety (90) days", "60 days'", "sixty days"
  const pattern = new RegExp(`\\b(?:(${words})\\s*(?:\\((\\d+)\\)\\s*)?|(\\d{1,3})\\s*(?:\\(\\d+\\)\\s*)?)(?:calendar\\s+|business\\s+)?days?\\b`, "gi");
  for (const match of text.matchAll(pattern)) {
    const days = match[3] ? Number(match[3]) : (match[2] ? Number(match[2]) : NUMBER_WORDS[match[1].toLowerCase()]);
    if (!days || days > 365) continue;
    const excerpt = sentenceAround(text, match.index ?? 0);
    const lower = excerpt.toLowerCase();
    const aboutNotice = /notice|non-?renew|terminate|cancel/.test(lower);
    if (!aboutNotice) continue; // "net 30 days" payment terms are not notice periods
    if (/payment|invoice|net\s+\d+/.test(lower) && !/non-?renew/.test(lower)) continue;
    const strong = /(prior|written)\s+(written\s+)?notice|notice of (non-?renewal|termination|cancel)/.test(lower) || /non-?renew/.test(lower);
    found.push({ value: days, excerpt, confidence: strong ? 90 : 70 });
  }
  return found;
}

function parseDate(raw: string): ISODate | null {
  const iso = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso && isValidISODate(iso[0])) return iso[0];
  const long = raw.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"));
  if (long) {
    const date = `${long[3]}-${pad(MONTHS.indexOf(long[1].toLowerCase()) + 1)}-${pad(Number(long[2]))}`;
    return isValidISODate(date) ? date : null;
  }
  const dayFirst = raw.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")}),?\\s+(\\d{4})\\b`, "i"));
  if (dayFirst) {
    const date = `${dayFirst[3]}-${pad(MONTHS.indexOf(dayFirst[2].toLowerCase()) + 1)}-${pad(Number(dayFirst[1]))}`;
    return isValidISODate(date) ? date : null;
  }
  return null;
}

export function extractTerms(text: string): ExtractionResult {
  const result: ExtractionResult = { conflicting: false };

  const notices = noticeCandidates(text);
  if (notices.length > 0) {
    const best = [...notices].sort((a, b) => b.confidence - a.confidence)[0];
    const distinct = new Set(notices.map((entry) => entry.value));
    result.conflicting = distinct.size > 1;
    result.noticeDays = result.conflicting ? { ...best, confidence: Math.min(best.confidence, 55) } : best;
  }

  const dateLine = /(renew(?:s|al)?(?:\s+date)?|term\s+(?:ends|expires)|expir(?:es|ation)|initial term)[^.\n]{0,60}/i.exec(text);
  if (dateLine) {
    const window = text.slice(dateLine.index, dateLine.index + 160);
    const date = parseDate(window);
    if (date) result.renewalDate = { value: date, excerpt: sentenceAround(text, dateLine.index), confidence: 85 };
  }

  const money = /(?:annual|yearly|per\s+year|subscription)[^.\n]{0,50}?(?:\$|USD\s*)\s?([\d,]+(?:\.\d+)?)|(?:\$|USD\s*)\s?([\d,]+(?:\.\d+)?)[^.\n]{0,30}?(?:per\s+year|annually|\/\s*year)/i.exec(text);
  if (money) {
    const amount = Number((money[1] ?? money[2]).replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) result.annualValue = { value: amount, excerpt: sentenceAround(text, money.index), confidence: 75 };
  }

  const auto = /automatically\s+renew|auto-?renew/i.exec(text);
  if (auto) result.autoRenews = { value: true, excerpt: sentenceAround(text, auto.index), confidence: 85 };

  return result;
}

/** Derives the cancel-by an extraction implies, for the confirmation screen. */
export function impliedCancelBy(renewalDate: ISODate, noticeDays: number): ISODate {
  return addDays(renewalDate, -noticeDays);
}
