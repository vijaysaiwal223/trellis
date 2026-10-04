import { people } from "@/config/people";
import {
  cancelByDateFor,
  contractTypeFor,
  formatShortDate,
  logoFor,
  rawVendorRecords,
  TODAY,
  usagePercentFor,
  windowHeadline,
} from "@/features/renewal-risk";
import { toVendorSlug } from "@/lib/vendor-slug";

import type { AlertTone, DetailRow, RenewalDetail, TimelinePoint, TimelineTone } from "./types";

const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;

function urgencyTone(daysToCancelBy: number): TimelineTone {
  if (daysToCancelBy < 0) return "danger";
  if (daysToCancelBy <= 7) return "warning";
  return "neutral";
}

const toneRank: Record<TimelineTone, number> = { neutral: 0, warning: 1, danger: 2 };

/**
 * A lighter, mechanically-derived detail page for the 18 vendors imported
 * from the Figma data table — real fields only, no hand-authored narrative.
 * The 5 curated vendors (Salesforce, Atlassian, Zapier, Notion, Vercel) keep
 * their bespoke pages in mock-data.ts; this is the fallback for everyone
 * else so their dashboard row's "View/Assign/Review" link doesn't 404.
 */
export const genericRenewalDetails: Record<string, RenewalDetail> = Object.fromEntries(
  rawVendorRecords.map((raw) => {
    const slug = toVendorSlug(raw.vendor);
    const noticeDays = raw.noticePeriodDays;
    const cancelByDate = cancelByDateFor(raw);
    const noticePeriodStart = new Date(cancelByDate);
    noticePeriodStart.setUTCDate(noticePeriodStart.getUTCDate() - noticeDays);
    const renewalDate = new Date(`${raw.renewalDate}T00:00:00Z`);
    const daysToCancelBy = Math.round((cancelByDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    const ownerless = raw.owner === null;
    const usagePercent = usagePercentFor(raw);
    const unusedSeats = raw.purchasedSeats - raw.activeSeats;
    const possibleWaste = formatCurrency((raw.contractValue / raw.purchasedSeats) * unusedSeats);

    const unsortedPoints: { label: TimelinePoint["label"]; date: Date; tone: TimelineTone }[] = [
      { label: "Notice period start", date: noticePeriodStart, tone: "neutral" as TimelineTone },
      { label: "Today", date: TODAY, tone: urgencyTone(daysToCancelBy) },
      { label: "Cancel-by", date: cancelByDate, tone: urgencyTone(daysToCancelBy) },
      { label: "Renewal date", date: renewalDate, tone: "neutral" as TimelineTone },
    ];
    const points = [...unsortedPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
    const timeline = points.map((point) => ({
      label: point.label,
      date: formatShortDate(point.date),
      tone: point.tone,
    })) as [TimelinePoint, TimelinePoint, TimelinePoint, TimelinePoint];
    const timelineSegments = [0, 1, 2].map(
      (i) => (toneRank[points[i].tone] >= toneRank[points[i + 1].tone] ? points[i].tone : points[i + 1].tone),
    ) as [TimelineTone, TimelineTone, TimelineTone];

    const statusAlert: { tone: AlertTone; title: string; description: string } =
      daysToCancelBy < 0
        ? { tone: "danger", title: "Cancel window missed", description: `${formatCurrency(raw.contractValue)} exposure. ${windowHeadline(daysToCancelBy)}.` }
        : ownerless && daysToCancelBy <= 30
          ? { tone: "danger", title: "Needs an owner", description: "No accountable owner, and the cancel-by window is approaching." }
          : daysToCancelBy <= 30
            ? { tone: "warning", title: "Decision needed soon", description: windowHeadline(daysToCancelBy) }
            : { tone: "info", title: "On track", description: `${raw.renewalType === "Auto-Renew" ? "Auto-renew" : "Negotiated"} contract. ${windowHeadline(daysToCancelBy)}.` };

    const contactDetails: DetailRow[] = [
      { label: "Annual contract", value: formatCurrency(raw.contractValue) },
      { label: "Renewal type", value: contractTypeFor() },
      { label: "Notice period", value: `${noticeDays} days` },
      { label: "YoY price change", value: raw.yoyPercent === 0 ? "0%" : `+${raw.yoyPercent}%` },
    ];

    const lastYear = raw.contractValue / (1 + raw.yoyPercent / 100);
    const twoYearsAgo = lastYear / (1 + raw.yoyPercent / 100);

    const ownership: DetailRow[] = ownerless
      ? [
          { label: "Status", value: "Unassigned" },
          { label: "Suggested owner", value: people[0].name },
        ]
      : [
          { label: "Current owner", value: raw.owner! },
          { label: "Team", value: "—" },
          { label: "Status", value: "Assigned" },
        ];

    const detail: RenewalDetail = {
      slug,
      vendor: raw.vendor,
      subtitle: raw.category,
      logo: logoFor(raw),
      statusAlert,
      timeline,
      timelineSegments,
      timelineNote: windowHeadline(daysToCancelBy),
      plan: {
        name: "Standard",
        purchasedSeats: raw.purchasedSeats,
        activeSeats: raw.activeSeats,
        unusedSeats,
        usagePercent,
        possibleWaste,
      },
      decisionReadiness: [
        { id: "owner", label: "Assign accountable owner", done: !ownerless },
        { id: "usage", label: "Confirm usage need", done: true },
        { id: "decision", label: "Record renewal decision", done: false },
      ],
      ownerOptions: people.map((person) => person.name),
      recommendation: {
        title: daysToCancelBy < 0 ? "Recover the missed window" : "Review before cancel-by",
        description: `${usagePercent}% of seats are active${raw.yoyPercent > 0 ? `, price up ${raw.yoyPercent}% YoY` : ""}. Decide before ${formatShortDate(cancelByDate)}.`,
        primaryAction: "Review usage",
        secondaryAction: "Mark decision",
      },
      contactDetails,
      usageEntitlement: [
        { label: "Purchase seats", value: String(raw.purchasedSeats) },
        { label: "Active seats", value: String(raw.activeSeats) },
        { label: "Seat usage", value: `${usagePercent}%`, progress: usagePercent },
        { label: "Possible waste", value: possibleWaste },
      ],
      ownership,
      paymentHistory: [
        { period: "2 years ago", amount: Math.round(twoYearsAgo) },
        { period: "Last year", amount: Math.round(lastYear) },
        { period: "This year", amount: raw.contractValue },
      ],
    };

    return [slug, detail];
  }),
);
