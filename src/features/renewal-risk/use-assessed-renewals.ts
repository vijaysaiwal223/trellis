"use client";

import { useMemo } from "react";

import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
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
          resolved: Boolean(resolution?.decision && !resolution.decision.draft),
        };
      }),
    [renewals, resolutions, departedOwners],
  );
}
