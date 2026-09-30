"use client";

import { Avatar, Text } from "@medusajs/ui";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { avatarUrl, people } from "@/config/people";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { SettingsCard, ToggleRow, initialsOf } from "./settings-ui";

export function DeparturesTab({ notify }: { notify: (message: string) => void }) {
  const { assignOwner, departedOwners, markDeparted, reinstateOwner, autoHandoff, setAutoHandoff } =
    useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const [confirming, setConfirming] = useState<string | null>(null);

  const owners = useMemo(() => {
    const byName = new Map<string, string[]>();
    assessed.forEach(({ row }) => {
      if (row.owner) byName.set(row.owner, [...(byName.get(row.owner) ?? []), row.vendor]);
    });
    return [...byName.entries()].map(([name, tools]) => ({
      name,
      tools,
      team: people.find((person) => person.name === name)?.team ?? "—",
    }));
  }, [assessed]);

  const successorFor = (name: string, team: string) => {
    const candidates = people.filter((person) => person.name !== name && !departedOwners.includes(person.name));
    return candidates.find((person) => person.team === team) ?? candidates[0];
  };

  const confirmDeparture = (name: string, team: string, tools: string[]) => {
    const successor = autoHandoff ? successorFor(name, team) : undefined;
    markDeparted(name);
    if (successor) {
      assessed.filter(({ row }) => row.owner === name).forEach(({ slug }) => assignOwner(slug, successor.name));
      notify(`${name} marked as departed. ${tools.join(", ")} handed to ${successor.name}.`);
    } else {
      notify(`${name} marked as departed. ${tools.join(", ")} now need an owner.`);
    }
    setConfirming(null);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <SettingsCard title="Handoff rule" description="What happens to someone's subscriptions when they leave.">
        <ToggleRow
          title="Hand off their subscriptions automatically"
          description="Reassign to a teammate on the same team right away. If off, the tools become unowned and escalate to finance admins."
          checked={autoHandoff}
          onChange={setAutoHandoff}
        />
      </SettingsCard>

      <SettingsCard
        title="People in charge"
        description="Simulate an offboarding to see the rule in action. You'll see the impact before it applies."
      >
        <div className="divide-y divide-ui-border-base">
          {owners.map((owner) => {
            const successor = successorFor(owner.name, owner.team);
            const isConfirming = confirming === owner.name;
            return (
              <div key={owner.name} className="flex flex-col gap-3 px-3 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={avatarUrl(owner.name)}
                      fallback={initialsOf(owner.name)}
                      variant="rounded"
                      size="base"
                    />
                    <span className="flex flex-col">
                      <Text as="span" className="text-[14px] font-bold leading-5 text-ui-fg-base">
                        {owner.name}
                      </Text>
                      <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">
                        {owner.team} · {owner.tools.join(", ")}
                      </Text>
                    </span>
                  </div>
                  {isConfirming ? null : (
                    <Button variant="secondary" size="base" onClick={() => setConfirming(owner.name)}>
                      Mark as departed
                    </Button>
                  )}
                </div>
                {isConfirming ? (
                  <Alert tone="warning">
                    <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
                      <span className="font-medium">
                        {owner.tools.length} subscription{owner.tools.length === 1 ? "" : "s"} affected.
                      </span>{" "}
                      {autoHandoff && successor
                        ? `${owner.tools.join(", ")} will be handed to ${successor.name} (${successor.team}).`
                        : `${owner.tools.join(", ")} will have no one in charge, rise in the queue, and escalate to finance admins.`}
                    </Text>
                    <div className="flex items-center gap-2">
                      <Button variant="primary" size="base" onClick={() => confirmDeparture(owner.name, owner.team, owner.tools)}>
                        Confirm departure
                      </Button>
                      <Button variant="secondary" size="base" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </div>
                  </Alert>
                ) : null}
              </div>
            );
          })}

          {departedOwners.map((name) => (
            <div key={name} className="flex items-center justify-between gap-4 bg-ui-bg-subtle px-3 py-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={avatarUrl(name)}
                  fallback={initialsOf(name)}
                  variant="rounded"
                  size="base"
                />
                <span className="flex flex-col">
                  <Text as="span" className="text-[14px] font-bold leading-5 text-ui-fg-muted line-through">
                    {name}
                  </Text>
                  <Text as="span" className="text-[14px] leading-5 text-ui-fg-error">
                    Left the company
                  </Text>
                </span>
              </div>
              <Button
                variant="secondary"
                size="base"
                onClick={() => {
                  reinstateOwner(name);
                  notify(`${name} reinstated.`);
                }}
              >
                Reinstate
              </Button>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}
