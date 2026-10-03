import type { IntegrationId, IntegrationSettings } from "@/config/integrations";

import { addDays, dayOfWeek, type ISODate } from "./deadlines";
import type { OrgSettings, OutboxEntry, RenewalResolution } from "./decision-model";
import { channelFor, mintToken } from "./escalation";
import { formatMoney, formatTotals, sumByCurrency } from "./money";
import type { Renewal } from "./types";
import { isDecisionCurrent } from "./workflow";

export type DigestSection = { title: string; lines: string[] };

export type Digest = {
  subject: string;
  /** Monday of the week the digest covers. */
  weekOf: ISODate;
  sections: DigestSection[];
  body: string;
};

type DigestRow = { row: Renewal; resolution?: RenewalResolution };

/** Monday of the week containing `date`. */
export function weekStart(date: ISODate): ISODate {
  const dow = dayOfWeek(date); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function line(row: Renewal): string {
  const who = row.decider ?? "no decider";
  return `${row.vendor} — decide by ${row.decideBy} · ${formatMoney(row.contractValue, row.currency)} · ${who}`;
}

/** The finance lead's one-page view: what needs a decision, what has slipped, and where we are guessing. */
export function buildDigest(rows: readonly DigestRow[], settings: Pick<OrgSettings, "financeLead" | "defaultNoticeDays">, today: ISODate): Digest {
  const open = rows.filter(({ row, resolution }) => !row.inactive && !(resolution?.decision && !resolution.decision.draft && isDecisionCurrent(row, resolution)));
  const byUrgency = [...open].sort((a, b) => a.row.daysToDecideBy - b.row.daysToDecideBy);

  const overdue = byUrgency.filter(({ row }) => row.daysToDecideBy < 0 && row.daysToCancelBy >= 0);
  const closed = byUrgency.filter(({ row }) => row.daysToCancelBy < 0 && row.contractType !== "Manual");
  const soon = byUrgency.filter(({ row }) => row.daysToDecideBy >= 0 && row.daysToDecideBy <= 30);
  const assumed = open.filter(({ row }) => row.noticeAssumed);
  const noDecider = open.filter(({ row }) => row.decider === null);

  const sections: DigestSection[] = [];
  if (overdue.length) sections.push({ title: `Overdue to decide (${overdue.length})`, lines: overdue.map(({ row }) => line(row)) });
  if (closed.length) {
    sections.push({
      title: `Notice window closed, will renew on silence (${closed.length})`,
      lines: closed.map(({ row }) => `${row.vendor} — cancel-by was ${row.cancelBy} · renews ${row.renewalDate} · ${formatMoney(row.contractValue, row.currency)}`),
    });
  }
  if (soon.length) sections.push({ title: `Decide in the next 30 days (${soon.length})`, lines: soon.map(({ row }) => line(row)) });

  const guesses: string[] = [];
  if (assumed.length) {
    const total = formatTotals(sumByCurrency(assumed.map(({ row }) => ({ amount: row.contractValue, currency: row.currency }))), false);
    guesses.push(`${plural(assumed.length, "contract")} (${total}) have no notice terms on file; deadlines assume ${settings.defaultNoticeDays} days.`);
  }
  if (noDecider.length) guesses.push(`${plural(noDecider.length, "contract")} have no decider.`);
  if (!settings.financeLead) guesses.push("No finance lead is set, so escalations have nowhere to go.");
  if (guesses.length) sections.push({ title: "Blind spots", lines: guesses });

  if (sections.length === 0) sections.push({ title: "All clear", lines: ["Nothing needs a decision this week."] });

  const subject = `Renewals digest: ${plural(overdue.length + closed.length, "item")} behind, ${plural(soon.length, "decision")} due soon`;
  const body = [subject, "", ...sections.flatMap((section) => [section.title, ...section.lines.map((entry) => `  • ${entry}`), ""])].join("\n").trim();
  return { subject, weekOf: weekStart(today), sections, body };
}

export type DigestPlanInput = {
  rows: readonly DigestRow[];
  settings: OrgSettings;
  outbox: readonly OutboxEntry[];
  integrations: Record<IntegrationId, IntegrationSettings>;
  today: ISODate;
  sentAt: string;
  /** Send even if this week's digest already went out (the "Send now" button). */
  force?: boolean;
};

/** One digest per week, to the finance lead. Returns null when it is not due or there is nobody to send it to. */
export function planDigest(input: DigestPlanInput): OutboxEntry | null {
  const { settings, outbox, today } = input;
  if (!settings.financeLead) return null;
  const week = weekStart(today);
  const already = outbox.some((entry) => entry.step === "digest" && entry.recipient === settings.financeLead && entry.scheduledFor === week);
  if (already && !input.force) return null;

  const digest = buildDigest(input.rows, settings, today);
  return {
    id: `digest:${week}:${settings.financeLead}${input.force && already ? `:${input.sentAt}` : ""}`,
    contractId: "digest",
    vendor: "All renewals",
    step: "digest",
    recipient: settings.financeLead,
    role: "finance-lead",
    channel: channelFor(input.integrations, "finance-lead"),
    scheduledFor: week,
    sentAt: input.sentAt,
    token: mintToken("digest", "digest", settings.financeLead),
    subject: digest.subject,
  };
}
