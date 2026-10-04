"use client";

import { useMemo } from "react";

import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useSettings } from "@/lib/settings-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { assessRenewal } from "./assessment";
import type { RenewalSeed } from "./types";

/** Renewals assessed against live session state: assigned owners, departures, recorded decisions. */
export function useAssessedRenewals(renewals: RenewalSeed[]) {
  const { resolutions, departedOwners } = useRenewalRuntime();
  const { overrides } = useSettings();

  return useMemo(
    () =>
      renewals.map((seed) => {
        const slug = toVendorSlug(seed.vendor);
        const resolution = resolutions[slug];
        // Admin corrections replace the seeded terms before any deadline is worked out.
        const terms = { ...seed, ...overrides[slug] };
        return {
          slug,
          row: assessRenewal(terms, resolution?.ownerAssigned, departedOwners),
          // "Resolved" means the risk is actually closed, not just that a
          // decision was recorded — a cancellation or downsize still has real
          // exposure until someone confirms the outcome.
          resolved: Boolean(resolution?.decision && isDecisionClosed(resolution.decision)),
        };
      }),
    [renewals, resolutions, departedOwners, overrides],
  );
}
