/**
 * Feature flags for the Renewal Decisions behaviour. Flags live in the
 * browser-local runtime state (Settings → Reminders → Prototype flags), so a
 * reviewer can flip between the original behaviour and the new one.
 */
export type FlagName = "renewalDecisions";

export type Flags = Record<FlagName, boolean>;

export const defaultFlags: Flags = {
  renewalDecisions: true,
};

export const flagLabels: Record<FlagName, { title: string; description: string }> = {
  renewalDecisions: {
    title: "Renewal Decisions",
    description:
      "Decide-by deadlines, a decider separate from the tool owner, the escalation ladder, and blind-spot tracking. Off restores the original cancel-by workflow.",
  },
};
