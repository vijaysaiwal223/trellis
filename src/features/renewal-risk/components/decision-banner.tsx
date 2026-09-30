"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Alert } from "@/components/ui/alert";
import { toVendorSlug } from "@/lib/vendor-slug";

import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";

export function DecisionBanner({ renewals }: { renewals: RenewalSeed[] }) {
  const assessed = useAssessedRenewals(renewals);

  const pending = useMemo(
    () =>
      assessed
        .filter((entry) => !entry.resolved)
        .map((entry) => entry.row)
        .sort((a, b) => b.urgency - a.urgency),
    [assessed],
  );

  if (pending.length === 0) {
    return (
      <Alert
        tone="success"
        role="status"
        title="All renewals have a recorded decision."
        description="Nothing will renew by surprise."
        className="mt-4"
      />
    );
  }

  const top = pending[0];
  const summary = `${top.vendor}: ${top.reasons.join(" · ")}`;

  return (
    <Alert
      tone="danger"
      role="alert"
      title={`${pending.length} renewal${pending.length === 1 ? "" : "s"} need a decision.`}
      description={`Most urgent — ${summary}`}
      className="mt-4"
    >
      <div className="flex w-full items-start gap-3">
        <Link
          href={`/renewals/${toVendorSlug(top.vendor)}`}
          className="text-[14px] font-medium leading-5 tracking-[-0.105px] text-ui-fg-base hover:underline"
        >
          Take action
        </Link>
      </div>
    </Alert>
  );
}
