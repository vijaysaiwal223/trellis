import type { IntegrationId, IntegrationSettings } from "@/config/integrations";

import { addDays, calendarDateIn, isBusinessDay, rollBackToBusinessDay, type ISODate } from "./deadlines";
import type { LadderStepId, NudgeChannel, OrgSettings, OutboxEntry, RenewalResolution } from "./decision-model";
import type { Renewal } from "./types";
import { isDecisionCurrent } from "./workflow";

/**
 * The escalation ladder is measured from the decide-by date, not the notice
 * deadline: the decision has to land before the legal clock gets close.
 * T-30 asks the decider, T-14 repeats (and brings in the finance lead if the
 * T-30 message was ignored), T-7 and decide-by day include the finance lead,
 * and the day after decide-by flags the miss.
 */
export type LadderStep = { id: LadderStepId; offsetDays: number; label: string };

export const LADDER: readonly LadderStep[] = [
  { id: "t30", offsetDays: -30, label: "30 days before decide-by" },
  { id: "t14", offsetDays: -14, label: "14 days before decide-by" },
  { id: "t7", offsetDays: -7, label: "7 days before decide-by" },
  { id: "deadline", offsetDays: 0, label: "Decide-by day" },
  { id: "missed", offsetDays: 1, label: "Decide-by missed" },
];

export const stepLabel = (id: LadderStepId | "digest") =>
  id === "digest" ? "Weekly digest" : (LADDER.find((step) => step.id === id)?.label ?? id);

/** The date a step is due. Earlier steps roll back to a business day; the "missed" step rolls forward. */
export function stepDate(decideBy: ISODate, step: LadderStep, holidays: readonly ISODate[] = []): ISODate {
  const raw = addDays(decideBy, step.offsetDays);
  if (step.id !== "missed") return rollBackToBusinessDay(raw, holidays).date;
  let date = raw;
  while (!isBusinessDay(date, holidays)) date = addDays(date, 1);
  return date;
}

export type LadderRow = { step: LadderStep; date: ISODate };

export function ladderFor(decideBy: ISODate, holidays: readonly ISODate[] = []): LadderRow[] {
  return LADDER.map((step) => ({ step, date: stepDate(decideBy, step, holidays) }));
}

// ---- simulated one-click links -------------------------------------------------

const TOKEN_SECRET = "trellis-prototype-not-a-secret";

/** FNV-1a. A stand-in for an HMAC: enough to show tamper-detection in the prototype, not real security. */
function checksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const slugOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function mintToken(contractId: string, step: LadderStepId | "digest", recipient: string): string {
  const payload = `${contractId}.${step}.${slugOf(recipient)}`;
  return `${payload}.${checksum(`${TOKEN_SECRET}|${payload}`)}`;
}

export type TokenCheck =
  | { status: "valid"; entry: OutboxEntry }
  | { status: "missing" | "forged" | "unknown" | "wrong-contract" | "used" };

/**
 * Whether a one-click link may act on a contract. A link is valid only if its
 * signature checks out, it was actually issued (is in the outbox), it was
 * issued for this contract, and it has not been used to record a decision.
 */
export function validateToken(token: string | null | undefined, contractId: string, outbox: readonly OutboxEntry[]): TokenCheck {
  if (!token) return { status: "missing" };
  const cut = token.lastIndexOf(".");
  if (cut < 1 || checksum(`${TOKEN_SECRET}|${token.slice(0, cut)}`) !== token.slice(cut + 1)) return { status: "forged" };
  const entry = outbox.find((candidate) => candidate.token === token);
  if (!entry) return { status: "unknown" };
  if (entry.contractId !== contractId) return { status: "wrong-contract" };
  if (entry.usedAt) return { status: "used" };
  return { status: "valid", entry };
}

// ---- planning ------------------------------------------------------------------

type PlanRow = { row: Renewal; resolution?: RenewalResolution };

export type PlanInput = {
  rows: readonly PlanRow[];
  settings: OrgSettings;
  outbox: readonly OutboxEntry[];
  integrations: Record<IntegrationId, IntegrationSettings>;
  today: ISODate;
  /** Timestamp stamped on every entry created by this plan. */
  sentAt: string;
};

export type HeldNudge = { contractId: string; step: LadderStepId; recipient: string; reason: "daily-limit" | "no-recipient" };

export type NudgePlan = { entries: OutboxEntry[]; held: HeldNudge[] };

/** Slack or Teams if the org connected one for this audience; otherwise email, so nothing is silently dropped. */
export function channelFor(
  integrations: Record<IntegrationId, IntegrationSettings>,
  role: OutboxEntry["role"],
): NudgeChannel {
  const wants = (settings: IntegrationSettings) => settings.connected && (role === "decider" ? settings.dmOwners : settings.postEscalations);
  if (wants(integrations.slack)) return "slack";
  if (wants(integrations.teams)) return "teams";
  return "email";
}

function subjectFor(row: Renewal, step: LadderStepId): string {
  const money = row.contractAmount;
  switch (step) {
    case "t30": return `Decision needed by ${row.decideBy}: ${row.vendor} (${money})`;
    case "t14": return `Reminder: decide ${row.vendor} by ${row.decideBy}`;
    case "t7": return `One week left to decide ${row.vendor} (by ${row.decideBy})`;
    case "deadline": return `Today: decide ${row.vendor} (${money})`;
    case "missed": return `Overdue: ${row.vendor} decision was due ${row.decideBy}`;
  }
}

type Recipient = { name: string; role: OutboxEntry["role"] };

function recipientsFor(
  step: LadderStepId,
  row: Renewal,
  resolution: RenewalResolution | undefined,
  financeLead: string | null,
  outbox: readonly OutboxEntry[],
): Recipient[] {
  const asDecider: Recipient[] = row.decider ? [{ name: row.decider, role: "decider" }] : [];
  const asFinance: Recipient[] = financeLead ? [{ name: financeLead, role: "finance-lead" }] : [];
  const handedOff = resolution?.decision && !resolution.decision.draft && resolution.decision.action === "Escalate";
  // An escalated decision belongs to the finance lead now; the decider has done their part.
  if (handedOff) return asFinance;

  // Silence escalation: the T-30 message went out and nobody acknowledged it.
  const ignoredFirstNudge =
    outbox.some((entry) => entry.contractId === row.id && entry.step === "t30" && entry.role === "decider") && !resolution?.acks?.t30;

  let audience: Recipient[];
  switch (step) {
    case "t30": audience = asDecider; break;
    case "t14": audience = ignoredFirstNudge ? [...asDecider, ...asFinance] : asDecider; break;
    default: audience = [...asDecider, ...asFinance];
  }
  // Nobody to ask: the finance lead gets it rather than the message vanishing.
  if (audience.length === 0) return asFinance;
  return audience;
}

/**
 * Decides which nudges go out right now. Pure: given the same state it returns
 * the same plan, and re-running it after the entries are appended returns
 * nothing (dedup by contract + step + recipient), so it is safe to call on
 * every state change.
 */
export function planNudges(input: PlanInput): NudgePlan {
  const { settings, outbox, integrations, today, sentAt } = input;
  const entries: OutboxEntry[] = [];
  const held: HeldNudge[] = [];

  const sent = new Set(outbox.map((entry) => `${entry.contractId}|${entry.step}|${entry.recipient}`));
  const sentToday = new Map<string, number>();
  for (const entry of outbox) {
    // The weekly digest is a summary, not a nudge, so it doesn't use up anyone's daily allowance.
    if (entry.step === "digest") continue;
    if (calendarDateIn(new Date(entry.sentAt), settings.orgTimeZone) === today) {
      sentToday.set(entry.recipient, (sentToday.get(entry.recipient) ?? 0) + 1);
    }
  }

  // Most urgent first, so the daily limit holds back the least pressing nudges.
  const ordered = [...input.rows].sort((a, b) => a.row.daysToDecideBy - b.row.daysToDecideBy);

  for (const { row, resolution } of ordered) {
    if (!row.decisionsEnabled || row.inactive) continue;
    // Stop-on-decision: a current decision ends the ladder (an escalation continues for the finance lead only).
    const decision = resolution?.decision;
    const decided = decision && !decision.draft && isDecisionCurrent(row, resolution);
    if (decided && decision.action !== "Escalate") continue;
    if (decided && decision.action === "Escalate" && !settings.financeLead) continue;

    // Latest step already due. Earlier ones are skipped on purpose: after a gap
    // (the app wasn't opened for days) one current message beats a burst of stale ones.
    const due = ladderFor(row.decideByISO, settings.holidays).filter((entry) => entry.date <= today);
    const current = due[due.length - 1];
    if (!current) continue;

    // A snooze quiets the early steps only; it never reaches decide-by day.
    const snoozed = resolution?.snooze && today <= resolution.snooze.until && current.step.id !== "deadline" && current.step.id !== "missed";
    if (snoozed) continue;

    const recipients = recipientsFor(current.step.id, row, resolution, settings.financeLead, outbox);
    if (recipients.length === 0) {
      held.push({ contractId: row.id, step: current.step.id, recipient: "", reason: "no-recipient" });
      continue;
    }

    for (const recipient of recipients) {
      const key = `${row.id}|${current.step.id}|${recipient.name}`;
      if (sent.has(key)) continue;
      if ((sentToday.get(recipient.name) ?? 0) >= settings.dailyNudgeLimit) {
        held.push({ contractId: row.id, step: current.step.id, recipient: recipient.name, reason: "daily-limit" });
        continue;
      }
      sent.add(key);
      sentToday.set(recipient.name, (sentToday.get(recipient.name) ?? 0) + 1);
      entries.push({
        id: `nudge:${key}`,
        contractId: row.id,
        vendor: row.vendor,
        step: current.step.id,
        recipient: recipient.name,
        role: recipient.role,
        channel: channelFor(integrations, recipient.role),
        scheduledFor: current.date,
        sentAt,
        token: mintToken(row.id, current.step.id, recipient.name),
        subject: subjectFor(row, current.step.id),
      });
    }
  }

  return { entries, held };
}
