import type { AlertTone } from "@/components/ui/alert";

export type { AlertTone };

export type TimelineTone = "neutral" | "warning" | "danger";

export type TimelinePoint = {
  label: string;
  date: string;
  tone: TimelineTone;
};

export type ChecklistItemId = "owner" | "usage" | "decision";

export type ChecklistItem = {
  id: ChecklistItemId;
  label: string;
  done: boolean;
};

/**
 * The three decisions an owner can make. "Right-size" is the stored value for
 * Downsize (kept so records saved before the rename still load).
 */
export type DecisionAction = "Renew" | "Right-size" | "Cancel";

/** What a user sees for a stored action. */
export function actionLabel(action: string): string {
  return action === "Right-size" ? "Downsize" : action;
}

export type DetailRow = {
  label: string;
  value: string;
  /** 0-100. When set, renders a usage bar next to the value instead of plain text. */
  progress?: number;
};

export type RenewalDetail = {
  slug: string;
  vendor: string;
  subtitle: string;
  logo: string;
  statusAlert: {
    tone: AlertTone;
    title: string;
    description: string;
  };
  timeline: TimelinePoint[];
  /** One tone per gap between consecutive timeline points. */
  timelineSegments: TimelineTone[];
  timelineNote: string;
  plan: {
    name: string;
    purchasedSeats: number;
    activeSeats: number;
    unusedSeats: number;
    usagePercent: number;
    possibleWaste: string;
  };
  decisionReadiness: ChecklistItem[];
  /** Candidate names offered when assigning an accountable owner inline. */
  ownerOptions: string[];
  recommendation: {
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  contactDetails: DetailRow[];
  usageEntitlement: DetailRow[];
  ownership: DetailRow[];
  /** Payment history — past renewal amounts, most recent last. Matches the given data model's "payment history and YoY price change". */
  paymentHistory: { period: string; amount: number }[];
  /**
   * Added field #2 (see FRAMING-MEMO.md): monthly purchased/active seat
   * history, most recent last — the current snapshot is in `plan`, this is
   * the trend behind it. Plausible because "active seats" is already sourced
   * from SSO logs (per the brief), and SSO activity is inherently a time
   * series, not a single read.
   */
  usageTrend: { month: string; purchasedSeats: number; activeSeats: number }[];
};
