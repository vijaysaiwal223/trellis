"use client";

import { Text } from "@medusajs/ui";
import { useState } from "react";

import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { SettingsCard, ToggleRow } from "./settings-ui";

const cadence = [
  { id: "t30", tag: "T-30", who: "Owner", title: "Ask the owner to decide", what: "Renew, right-size or cancel — one click, no login." },
  { id: "t14", tag: "T-14", who: "Owner + Finance", title: "Remind the owner", what: "Finance is copied and the renewal moves up the queue." },
  { id: "t7", tag: "T-7", who: "Finance admins", title: "Escalate", what: "Finance & procurement admins take over if the owner is silent." },
  { id: "t2", tag: "T-2", who: "Finance admins", title: "Decide today or it renews", what: "Urgent alert until a decision is recorded." },
];

// The ladder when Renewal Decisions is on: counted back from decide-by, with real audiences.
const decisionCadence = [
  { id: "t30", tag: "T-30", who: "Decider", title: "Ask the decider to decide", what: "Renew, renegotiate, downsize or cancel — one click, no login." },
  { id: "t14", tag: "T-14", who: "Decider (+ finance lead if ignored)", title: "Remind the decider", what: "If the first message was never acknowledged, the finance lead is copied." },
  { id: "t7", tag: "T-7", who: "Decider + finance lead", title: "Escalate", what: "The finance lead sees it too." },
  { id: "deadline", tag: "Day 0", who: "Decider + finance lead", title: "Decide today", what: "Decide-by day. Snoozing no longer applies." },
  { id: "missed", tag: "Missed", who: "Decider + finance lead", title: "Decide-by missed", what: "Flagged once, on the next business day. A decision recorded at any point stops everything." },
];

export function RemindersTab() {
  const { flags } = useRenewalRuntime();
  const decisionsOn = flags.renewalDecisions;
  const steps = decisionsOn ? decisionCadence : cadence;
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ t30: true, t14: true, t7: true, t2: true });
  const [autoNonRenew, setAutoNonRenew] = useState(false);
  const assessed = useAssessedRenewals(renewals);
  const eligible = assessed.filter(({ row }) => parseInt(row.usage, 10) < 50 && row.contractValue < 25_000).length;

  return (
    <div className="flex w-full flex-col gap-4">
      <SettingsCard
        title="Reminder schedule"
        description={decisionsOn
          ? "Counted back from the decide-by date (cancel-by minus lead time), so the decision lands before the notice clock gets close."
          : "Counted back from the cancel-by date (renewal date minus notice period), not the renewal date."}
      >
        <div className="divide-y divide-ui-border-base">
          {steps.map((step) => (
            <ToggleRow
              key={step.id}
              leading={
                <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle text-[12px] font-bold text-ui-fg-subtle">
                  {step.tag}
                </span>
              }
              title={`${step.title} · ${step.who}`}
              description={step.what}
              checked={enabled[step.id]}
              onChange={(value) => setEnabled((prev) => ({ ...prev, [step.id]: value }))}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Cheap-tool policy" description="For tools where a wrong call costs little.">
        <ToggleRow
          title="Send a non-renewal notice unless someone says keep"
          description={`Applies to subscriptions under 50% seat usage and under $25,000. ${eligible} qualify today.`}
          checked={autoNonRenew}
          onChange={setAutoNonRenew}
        />
      </SettingsCard>

      <Text as="p" className="text-[14px] leading-5 text-ui-fg-muted">
        {decisionsOn
          ? "Prototype: the ladder runs for real against the demo clock, but messages only land in the nudge log (Decisions tab). Nothing is delivered."
          : "Prototype: these switches show the intended policy but don't send anything yet."}
      </Text>
    </div>
  );
}
