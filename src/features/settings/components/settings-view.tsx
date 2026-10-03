"use client";

import { Text, clx } from "@medusajs/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { DeparturesTab } from "./departures-tab";
import { IntegrationsTab } from "./integrations-tab";
import { OwnershipTab } from "./ownership-tab";
import { RemindersTab } from "./reminders-tab";

const tabs = ["Ownership", "Integration", "Departure", "Reminder"] as const;
type Tab = (typeof tabs)[number];

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "success" }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3">
      <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">
        {label}
      </Text>
      <Text
        as="span"
        className={clx(
          "font-heading text-[20px] font-bold leading-7",
          tone === "danger" ? "text-ui-fg-error" : tone === "success" ? "text-ui-tag-green-text" : "text-ui-fg-base",
        )}
      >
        {value}
      </Text>
    </div>
  );
}

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("Ownership");
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { departedOwners, integrations } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);

  const needOwner = assessed.filter(({ row }) => !row.owner).length;

  const notify = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const connectedCount = Object.values(integrations).filter((entry) => entry.connected).length;
  // Integrations flag red when nothing is connected: alerts then only live inside Trellis.
  const badge: Partial<Record<Tab, number>> = {
    Ownership: needOwner,
    Integration: connectedCount === 0 ? 1 : 0,
    Departure: departedOwners.length,
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full gap-3">
        <Stat label="Subscriptions" value={assessed.length} />
        <Stat label="Have someone in charge" value={assessed.length - needOwner} tone="success" />
        <Stat label="Need someone in charge" value={needOwner} tone={needOwner > 0 ? "danger" : undefined} />
      </div>

      <div role="status" aria-live="polite" className="min-h-0">
        {notice ? (
          <Alert tone="success">
            <div className="flex w-full items-center justify-between gap-3">
              <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
                {notice}
              </Text>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-[14px] font-medium text-ui-fg-base hover:underline"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        ) : null}
      </div>

      <div className="flex h-10 w-full items-start gap-2 border-b border-ui-border-base" role="tablist">
        {tabs.map((name) => {
          const active = name === tab;
          const count = badge[name];
          return (
            <div
              key={name}
              className={clx("flex items-center overflow-hidden pb-2", active && "border-b-2 border-ui-bg-interactive")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(name)}
                className={clx("flex items-center gap-2 rounded px-2 py-1.5", active && "bg-ui-bg-interactive-soft")}
              >
                <Text
                  as="span"
                  className={clx(
                    "text-[14px] font-medium leading-5",
                    active ? "text-ui-fg-interactive" : "text-ui-fg-muted",
                  )}
                >
                  {name}
                </Text>
                {count ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-ui-tag-red-icon px-1 text-[11px] font-bold leading-4 text-white">
                    {count}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>

      {tab === "Ownership" ? <OwnershipTab notify={notify} /> : null}
      {tab === "Integration" ? <IntegrationsTab notify={notify} /> : null}
      {tab === "Departure" ? <DeparturesTab notify={notify} /> : null}
      {tab === "Reminder" ? <RemindersTab /> : null}
    </div>
  );
}
