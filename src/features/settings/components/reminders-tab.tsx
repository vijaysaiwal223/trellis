"use client";

import { Text } from "@medusajs/ui";
import Link from "next/link";
import { useState } from "react";

import { renewals, useAssessedRenewals } from "@/features/renewal-risk";

import { SettingsCard, ToggleRow } from "./settings-ui";

const cadence = [
  { id: "t30", tag: "T-30", who: "Owner", title: "Ask the owner to decide", what: "Renew, right-size or cancel — one click, no login." },
  { id: "t14", tag: "T-14", who: "Owner + Finance", title: "Remind the owner", what: "Finance is copied and the renewal moves up the queue." },
  { id: "t7", tag: "T-7", who: "Finance admins", title: "Escalate", what: "Finance & procurement admins take over if the owner is silent." },
  { id: "t2", tag: "T-2", who: "Finance admins", title: "Decide today or it renews", what: "Urgent alert until a decision is recorded." },
];

export function RemindersTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ t30: true, t14: true, t7: true, t2: true });
  const [autoNonRenew, setAutoNonRenew] = useState(false);
  const assessed = useAssessedRenewals(renewals);
  const eligible = assessed.filter(({ row }) => parseInt(row.usage, 10) < 50 && row.contractValue < 25_000).length;

  return (
    <div className="flex w-full flex-col gap-4">
      <SettingsCard
        title="Monday digest"
        description="The weekly summary of decisions due, past deadlines and open renewals without an owner."
      >
        <Link href="/digest" className="inline-flex text-[14px] font-medium text-ui-fg-interactive hover:underline">
          Preview the Monday digest →
        </Link>
      </SettingsCard>
      <SettingsCard
        title="Reminder schedule"
        description="Counted back from the cancel-by date (renewal date minus notice period), not the renewal date."
      >
        <div className="divide-y divide-ui-border-base">
          {cadence.map((step) => (
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
        Prototype: these switches show the intended policy but don&apos;t send anything yet.
      </Text>
    </div>
  );
}
