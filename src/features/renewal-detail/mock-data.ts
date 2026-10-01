import { assetPath } from "@/lib/assets";

import type { RenewalDetail } from "./types";

// Static fixtures until a real data source is wired up.

export const renewalDetails: Record<string, RenewalDetail> = {
  salesforce: {
    slug: "salesforce",
    vendor: "Salesforce",
    subtitle: "Project Management",
    logo: assetPath("vendor-salesforce.png"),
    statusAlert: {
      tone: "danger",
      title: "Cancel window missed",
      description: "Auto-renew fired risk. $180k exposure. Owner departed",
    },
    timeline: [
      { label: "Notice period start", date: "Aug 21", tone: "neutral" },
      { label: "Cancel-by", date: "Sep 20", tone: "danger" },
      { label: "Today", date: "Sep 26", tone: "danger" },
      { label: "Renewal date", date: "Oct 20", tone: "neutral" },
    ],
    timelineSegments: ["neutral", "danger", "neutral"],
    timelineNote: "Real deadline is the cancel-by date, not the renewal date",
    plan: {
      name: "Enterprise",
      purchasedSeats: 420,
      activeSeats: 269,
      unusedSeats: 151,
      usagePercent: 64,
      possibleWaste: "$64,714",
    },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: false },
      { id: "usage", label: "Confirm usage need", done: true },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: ["Maya Rao", "Rohan Mehta", "Priya Nair"],
    recommendation: {
      title: "Renegotiate before renewal",
      description:
        "Usage is down to 64% while the price is up 22% YoY — you're paying more for less. Worth pushing back before this renews.",
      primaryAction: "Review usage",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Annual contract", value: "$180,000" },
      { label: "Renewal type", value: "Auto-renew" },
      { label: "Notice period", value: "30 days" },
      { label: "YoY price change", value: "+22%" },
    ],
    paymentHistory: [
      { period: "2 years ago", amount: 129000 },
      { period: "Last year", amount: 148000 },
      { period: "This year", amount: 180000 },
    ],
    usageEntitlement: [
      { label: "Purchase seats", value: "420" },
      { label: "Active seats", value: "269" },
      { label: "Seat usage", value: "64%", progress: 64 },
      { label: "Possible waste", value: "$64,714" },
    ],
    ownership: [
      { label: "Previous owner", value: "Elena Chen" },
      { label: "Status", value: "Vacant · 30 days" },
      { label: "Suggested owner", value: "Maya Rao" },
    ],
  },

  atlassian: {
    slug: "atlassian",
    vendor: "Atlassian",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-atlassian.png"),
    statusAlert: {
      tone: "info",
      title: "In review",
      description: "Auto-renew active. Owner is validating usage before the window closes.",
    },
    timeline: [
      { label: "Notice period start", date: "Oct 21", tone: "neutral" },
      { label: "Today", date: "Sep 26", tone: "neutral" },
      { label: "Cancel-by", date: "Nov 20", tone: "neutral" },
      { label: "Renewal date", date: "Dec 20", tone: "neutral" },
    ],
    timelineSegments: ["neutral", "neutral", "neutral"],
    timelineNote: "55 days of runway left before the cancel-by window closes",
    plan: {
      name: "Standard",
      purchasedSeats: 60,
      activeSeats: 51,
      unusedSeats: 9,
      usagePercent: 85,
      possibleWaste: "$5,760",
    },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: true },
      { id: "usage", label: "Confirm usage need", done: true },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: ["Rohan Mehta", "Maya Rao", "Priya Nair"],
    recommendation: {
      title: "On track to renew",
      description: "85% of seats are active and earning their keep — renewing at the current size is the safe call.",
      primaryAction: "Review usage",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Annual contract", value: "$96,000" },
      { label: "Renewal type", value: "Auto-renew" },
      { label: "Notice period", value: "30 days" },
      { label: "YoY price change", value: "+4%" },
    ],
    paymentHistory: [
      { period: "2 years ago", amount: 88000 },
      { period: "Last year", amount: 92000 },
      { period: "This year", amount: 96000 },
    ],
    usageEntitlement: [
      { label: "Purchase seats", value: "60" },
      { label: "Active seats", value: "51" },
      { label: "Seat usage", value: "85%", progress: 85 },
      { label: "Possible waste", value: "$5,760" },
    ],
    ownership: [
      { label: "Current owner", value: "Rohan Mehta" },
      { label: "Team", value: "Engineering" },
      { label: "Status", value: "Assigned" },
    ],
  },

  zapier: {
    slug: "zapier",
    vendor: "Zapier",
    subtitle: "CRM",
    logo: assetPath("vendor-zapier.png"),
    statusAlert: {
      tone: "success",
      title: "On track",
      description: "Manual renewal. Nothing fires automatically if no one acts.",
    },
    timeline: [
      { label: "Notice period start", date: "Sep 20", tone: "neutral" },
      { label: "Today", date: "Sep 26", tone: "warning" },
      { label: "Cancel-by", date: "Sep 28", tone: "warning" },
      { label: "Renewal date", date: "Oct 20", tone: "neutral" },
    ],
    timelineSegments: ["neutral", "warning", "neutral"],
    timelineNote: "Only 2 days left in the cancel-by window",
    plan: {
      name: "Team",
      purchasedSeats: 40,
      activeSeats: 31,
      unusedSeats: 9,
      usagePercent: 78,
      possibleWaste: "$21,600",
    },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: false },
      { id: "usage", label: "Confirm usage need", done: true },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: ["Priya Nair", "Rohan Mehta", "Maya Rao"],
    recommendation: {
      title: "Assign an owner before Sep 28",
      description: "Nobody's watching this one, and manual renewals don't decide themselves — assign an owner before the window closes in 2 days.",
      primaryAction: "Review usage",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Annual contract", value: "$96,000" },
      { label: "Renewal type", value: "Manual" },
      { label: "Notice period", value: "0 days" },
      { label: "YoY price change", value: "+1%" },
    ],
    paymentHistory: [
      { period: "2 years ago", amount: 94000 },
      { period: "Last year", amount: 95000 },
      { period: "This year", amount: 96000 },
    ],
    usageEntitlement: [
      { label: "Purchase seats", value: "40" },
      { label: "Active seats", value: "31" },
      { label: "Seat usage", value: "78%", progress: 78 },
      { label: "Possible waste", value: "$21,600" },
    ],
    ownership: [
      { label: "Previous owner", value: "Rohan Mehta" },
      { label: "Status", value: "Unassigned" },
      { label: "Suggested owner", value: "Priya Nair" },
    ],
  },

  notion: {
    slug: "notion",
    vendor: "Notion",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-notion.png"),
    statusAlert: {
      tone: "info",
      title: "Monitor",
      description: "Month-to-month. Low commitment, but usage should be checked regularly.",
    },
    timeline: [
      { label: "Notice period start", date: "Oct 6", tone: "neutral" },
      { label: "Today", date: "Sep 26", tone: "neutral" },
      { label: "Cancel-by", date: "Nov 6", tone: "warning" },
      { label: "Renewal date", date: "Nov 20", tone: "neutral" },
    ],
    timelineSegments: ["neutral", "warning", "neutral"],
    timelineNote: "Month-to-month renewals repeat this window every 30 days",
    plan: {
      name: "Business",
      purchasedSeats: 25,
      activeSeats: 22,
      unusedSeats: 3,
      usagePercent: 88,
      possibleWaste: "$11,520",
    },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: true },
      { id: "usage", label: "Confirm usage need", done: false },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: ["Rohan Mehta", "Maya Rao", "Priya Nair"],
    recommendation: {
      title: "Confirm usage need",
      description: "88% usage looks healthy — the one open item is confirming it's still needed before the next cancel-by window.",
      primaryAction: "Review usage",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Annual contract", value: "$96,000" },
      { label: "Renewal type", value: "Month-to-month" },
      { label: "Notice period", value: "0 days" },
      { label: "YoY price change", value: "+9%" },
    ],
    paymentHistory: [
      { period: "2 years ago", amount: 83000 },
      { period: "Last year", amount: 88000 },
      { period: "This year", amount: 96000 },
    ],
    usageEntitlement: [
      { label: "Purchase seats", value: "25" },
      { label: "Active seats", value: "22" },
      { label: "Seat usage", value: "88%", progress: 88 },
      { label: "Possible waste", value: "$11,520" },
    ],
    ownership: [
      { label: "Current owner", value: "Jasmine Patel" },
      { label: "Team", value: "Finance" },
      { label: "Status", value: "Assigned" },
    ],
  },

  vercel: {
    slug: "vercel",
    vendor: "Vercel",
    subtitle: "Coding Agent",
    logo: assetPath("vendor-vercel.png"),
    statusAlert: {
      tone: "danger",
      title: "Needs decision",
      description: "Month-to-month. Renews automatically each cycle until someone cancels.",
    },
    timeline: [
      { label: "Notice period start", date: "Oct 6", tone: "neutral" },
      { label: "Today", date: "Sep 26", tone: "warning" },
      { label: "Cancel-by", date: "Nov 6", tone: "warning" },
      { label: "Renewal date", date: "Nov 20", tone: "neutral" },
    ],
    timelineSegments: ["neutral", "warning", "neutral"],
    timelineNote: "Real deadline is the cancel-by date, not the renewal date",
    plan: {
      name: "Pro",
      purchasedSeats: 25,
      activeSeats: 23,
      unusedSeats: 2,
      usagePercent: 91,
      possibleWaste: "$7,680",
    },
    decisionReadiness: [
      { id: "owner", label: "Assign accountable owner", done: true },
      { id: "usage", label: "Confirm usage need", done: true },
      { id: "decision", label: "Record renewal decision", done: false },
    ],
    ownerOptions: ["Rohan Mehta", "Maya Rao", "Priya Nair"],
    recommendation: {
      title: "Record a renewal decision",
      description: "Usage and ownership are settled — the only thing left is your call: renew, right-size, or cancel.",
      primaryAction: "Review usage",
      secondaryAction: "Mark decision",
    },
    contactDetails: [
      { label: "Annual contract", value: "$96,000" },
      { label: "Renewal type", value: "Month-to-month" },
      { label: "Notice period", value: "0 days" },
      { label: "YoY price change", value: "+6%" },
    ],
    paymentHistory: [
      { period: "2 years ago", amount: 87000 },
      { period: "Last year", amount: 91000 },
      { period: "This year", amount: 96000 },
    ],
    usageEntitlement: [
      { label: "Purchase seats", value: "25" },
      { label: "Active seats", value: "23" },
      { label: "Seat usage", value: "91%", progress: 91 },
      { label: "Possible waste", value: "$7,680" },
    ],
    ownership: [
      { label: "Current owner", value: "Marcus Webb" },
      { label: "Team", value: "Engineering" },
      { label: "Status", value: "Assigned" },
    ],
  },
};
