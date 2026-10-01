"use client";

import { IconButton, Text, clx } from "@medusajs/ui";
import { RiNotification3Line } from "@remixicon/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { renewals, useAssessedRenewals, windowHeadline } from "@/features/renewal-risk";
import { integrationApps } from "@/config/integrations";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

// Only renewals worth interrupting someone for (Medium risk and above).
const ALERT_THRESHOLD = 15;

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const assessed = useAssessedRenewals(renewals);
  const { integrations } = useRenewalRuntime();
  const deliveredTo = integrationApps
    .filter((app) => integrations[app.id].connected && integrations[app.id].postEscalations && integrations[app.id].channel)
    .map((app) => `${app.name} ${integrations[app.id].channel}`);

  const alerts = useMemo(
    () =>
      assessed
        .filter((entry) => !entry.resolved)
        .map((entry) => entry.row)
        .filter((row) => row.urgency >= ALERT_THRESHOLD)
        .sort((a, b) => b.urgency - a.urgency),
    [assessed],
  );

  return (
    <div className="relative">
      <IconButton
        type="button"
        variant="transparent"
        aria-label={`Notifications (${alerts.length})`}
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        className="!flex !size-8 !items-center !justify-center rounded-full !bg-ui-bg-base !shadow-borders-base hover:!bg-ui-bg-base-hover after:hidden"
      >
        <RiNotification3Line className="size-5 text-ui-fg-subtle" />
      </IconButton>
      {alerts.length > 0 ? (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ui-tag-red-icon px-1 text-[11px] font-bold leading-4 text-white">
          {alerts.length}
        </span>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-[38px] z-50 flex w-[360px] flex-col overflow-hidden rounded-[8px] bg-ui-bg-base shadow-elevation-flyout">
          <div className="border-b border-ui-border-base px-3 py-2">
            <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
              Needs attention before cancel-by
            </Text>
          </div>
          {alerts.length === 0 ? (
            <Text as="p" className="px-3 py-4 text-[14px] leading-5 text-ui-fg-muted">
              You&apos;re clear. Every renewal at risk has a recorded decision.
            </Text>
          ) : (
            <ul className="flex max-h-[360px] flex-col divide-y divide-ui-border-base overflow-y-auto">
              {alerts.map((row) => (
                <li key={row.vendor}>
                  <Link
                    href={`/renewals/${toVendorSlug(row.vendor)}`}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-0.5 px-3 py-2.5 hover:bg-ui-bg-subtle"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                        {row.vendor}
                      </Text>
                      <Text
                        as="span"
                        className={clx(
                          "text-[12px] font-medium leading-4",
                          row.timingTone === "danger"
                            ? "text-ui-fg-error"
                            : row.timingTone === "warning"
                              ? "text-ui-tag-orange-text"
                              : "text-ui-fg-subtle",
                        )}
                      >
                        {windowHeadline(row.daysToCancelBy)}
                      </Text>
                    </span>
                    <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
                      {row.reasons.filter((reason) => !reason.startsWith("Cancel")).join(" · ")}
                    </Text>
                    {row.escalationState === "needsDecision" ? (
                      <Text as="span" className="text-[12px] font-medium leading-4 text-ui-tag-red-text">
                        Auto-escalated to finance &amp; procurement admins
                        {deliveredTo.length > 0 ? ` · posted to ${deliveredTo.join(", ")}` : ""}
                      </Text>
                    ) : row.escalationState === "waitingOnOwner" ? (
                      <Text as="span" className="text-[12px] font-medium leading-4 text-ui-tag-orange-text">
                        Waiting on {row.owner} — cancel window already missed
                      </Text>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
