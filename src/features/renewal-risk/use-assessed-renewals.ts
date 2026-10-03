"use client";

import { useMemo } from "react";

import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { assessRenewal } from "./assessment";
import type { RenewalSeed } from "./types";

/** Renewals assessed against live session state: assigned owners, departures, recorded decisions. */
export function useAssessedRenewals(renewals: RenewalSeed[]) {
  const { resolutions, departedOwners } = useRenewalRuntime();

  return useMemo(
    () =>
      renewals.map((seed) => {
        const slug = toVendorSlug(seed.vendor);
        const resolution = resolutions[slug];
        return {
          slug,
          row: assessRenewal(seed, resolution?.ownerAssigned, departedOwners),
          // "Resolved" means the risk is actually closed, not just that a
          // decision was recorded — a cancellation or downsize still has real
          // exposure until someone confirms the outcome.
          resolved: Boolean(resolution?.decision && isDecisionClosed(resolution.decision)),
        };
      }),
    [renewals, resolutions, departedOwners],
  );
}
