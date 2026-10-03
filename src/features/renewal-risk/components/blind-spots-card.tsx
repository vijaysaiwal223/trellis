"use client";

import { Text, clx } from "@medusajs/ui";
import { RiEyeOffLine } from "@remixicon/react";
import Link from "next/link";
import { useMemo } from "react";

import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { findBlindSpots } from "../blindspots";
import { formatTotals } from "../money";
import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";

/** What the system is guessing at or has nobody to tell — each with the money riding on it. */
export function BlindSpotsCard({ renewals }: { renewals: RenewalSeed[] }) {
  const assessed = useAssessedRenewals(renewals);
  const { settings } = useRenewalRuntime();
  const spots = useMemo(() => findBlindSpots(assessed.map((entry) => entry.row), settings), [assessed, settings]);
  const clear = spots.total === 0;

  return (
    <section aria-labelledby="blind-spots-heading" className="rounded-xl border border-ui-border-base bg-ui-bg-base p-3">
      <div className="flex items-center gap-2">
        <RiEyeOffLine className={clx("size-4", clear ? "text-ui-fg-muted" : "text-ui-tag-orange-icon")} aria-hidden="true" />
        <h2 id="blind-spots-heading" className="text-[15px] font-semibold leading-5 text-ui-fg-base">Blind spots</h2>
        <span className="rounded-full bg-ui-bg-subtle-hover px-2 py-0.5 text-[11px] font-medium text-ui-fg-subtle">{spots.total}</span>
      </div>
      {clear ? (
        <Text as="p" className="mt-2 text-[13px] text-ui-fg-subtle">Every contract has notice terms and a decider, and a finance lead is set.</Text>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {spots.noticeMissing.length > 0 ? (
            <li className="text-[13px] leading-5 text-ui-fg-base">
              <span className="font-semibold">{formatTotals(spots.noticeMissingValue)}</span> renews on an assumed {settings.defaultNoticeDays}-day notice period —{" "}
              {spots.noticeMissing.length} contract{spots.noticeMissing.length === 1 ? "" : "s"} with no notice terms on file:{" "}
              {spots.noticeMissing.map((row, index) => (
                <span key={row.id}>
                  {index > 0 ? ", " : ""}
                  <Link href={`/renewals/${row.id}?task=terms`} className="font-medium text-ui-fg-interactive hover:underline">{row.vendor}</Link>
                </span>
              ))}
              .
            </li>
          ) : null}
          {spots.deciderMissing.length > 0 ? (
            <li className="text-[13px] leading-5 text-ui-fg-base">
              <span className="font-semibold">{spots.deciderMissing.length}</span> contract{spots.deciderMissing.length === 1 ? " has" : "s have"} no decider, so no reminder reaches a person:{" "}
              {spots.deciderMissing.map((row, index) => (
                <span key={row.id}>
                  {index > 0 ? ", " : ""}
                  <Link href={`/renewals/${row.id}?task=assign`} className="font-medium text-ui-fg-interactive hover:underline">{row.vendor}</Link>
                </span>
              ))}
              .
            </li>
          ) : null}
          {spots.financeLeadMissing ? (
            <li className="text-[13px] leading-5 text-ui-fg-base">
              <span className="font-semibold">No finance lead</span> is set, so escalations from T-14 on have nowhere to go.{" "}
              <Link href="/settings?tab=Decisions" className="font-medium text-ui-fg-interactive hover:underline">Set one</Link>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
