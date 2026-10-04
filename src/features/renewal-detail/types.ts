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
 * The four answers to a renewal. "Right-size" is the stored value for
 * Downsize (kept so records saved before the rename still load).
 */
export type DecisionAction = "Renew" | "Right-size" | "Cancel" | "Renegotiate";

/** What a user sees for a stored action. */
export function actionLabel(action: string): string {
  return action === "Right-size" ? "Downsize" : action;
}

/**
 * Answers that change the contract, so the vendor needs written notice before
 * cancel-by. Renewing as-is needs no notice; renegotiating needs the vendor's
 * agreement but isn't a notice to leave or shrink.
 */
export function needsWrittenNotice(action: DecisionAction): boolean {
  return action === "Right-size" || action === "Cancel";
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
};
