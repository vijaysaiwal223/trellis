"use client";

import Image from "next/image";
import Link from "next/link";
import { Text } from "@medusajs/ui";
import { RiCloseLine } from "@remixicon/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { renewals, useAssessedRenewals, windowHeadline } from "@/features/renewal-risk";
import { mintToken } from "@/features/renewal-risk/nudge-link";
import { toVendorSlug } from "@/lib/vendor-slug";

import { actionLabel, type RenewalDetail } from "../types";

const nudgeActions = ["Renew", "Right-size", "Cancel", "Not mine"] as const;

/** Simulated owner message with a working link into the no-login decision page. */
export function OwnerNudgePreview({ detail }: { detail: RenewalDetail }) {
  const [open, setOpen] = useState(false);
  const slug = toVendorSlug(detail.vendor);
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  // Each nudge carries its own signed, single-use link into the no-login decision page.
  const token = row?.owner ? mintToken(slug, row.owner) : null;
  const linkFor = (action: string) => `/decide/${slug}?action=${encodeURIComponent(action)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;

  return (
    <>
      <Button variant="secondary" size="base" onClick={() => setOpen(true)}>
        Preview owner nudge
      </Button>

      {open && row ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ui-fg-base/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Owner nudge preview"
            onClick={(event) => event.stopPropagation()}
            className="flex w-full max-w-[420px] flex-col gap-3 rounded-[12px] bg-ui-bg-base p-4 shadow-elevation-flyout"
          >
            <div className="flex items-center justify-between">
              <Text as="span" className="text-[12px] font-medium uppercase tracking-wide text-ui-fg-muted">
                Example message for {row.owner ?? "the owner"}
              </Text>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex size-6 items-center justify-center rounded text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
              >
                <RiCloseLine className="size-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3 rounded-[8px] border border-ui-border-base bg-ui-bg-subtle p-3">
              <Image src={detail.logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-[6px] object-cover" />
              <div className="flex min-w-0 flex-col gap-2">
                <Text as="p" className="text-[14px] leading-5 text-ui-fg-base">
                  <span className="font-medium">{detail.vendor}</span> renews for{" "}
                  <span className="font-medium">{row.contractAmount}</span>. You must cancel by{" "}
                  <span className="font-medium">{row.cancelBy}</span> ({windowHeadline(row.daysToCancelBy).toLowerCase()}).{" "}
                  Please decide by <span className="font-medium">{row.decideBy}</span>.{" "}
                  {detail.plan.activeSeats} of {detail.plan.purchasedSeats} seats active ({detail.plan.usagePercent}%).
                </Text>
                <div className="flex flex-wrap gap-2">
                  {nudgeActions.map((action) => (
                    <Button key={action} asChild variant="secondary" size="small">
                      <Link href={linkFor(action)} onClick={() => setOpen(false)}>
                        {action === "Not mine" ? action : actionLabel(action)}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">
              Preview only. No Slack or email message is sent. Each link is signed and works once.
            </Text>
          </div>
        </div>
      ) : null}
    </>
  );
}
