"use client";

import { useMemo } from "react";

import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { assessRenewal } from "./assessment";
import { isDecisionCurrent } from "./workflow";
import type { RenewalSeed } from "./types";

/**
 * Renewals assessed against live session state: assigned owners, departures,
 * recorded decisions, org settings and any contracts added by import. Inactive
 * (cancelled/ended) contracts are left out unless asked for.
 */
export function useAssessedRenewals(renewals: RenewalSeed[], options: { includeInactive?: boolean } = {}) {
  const { resolutions, departedOwners, settings, flags, today, addedContracts } = useRenewalRuntime();
  const includeInactive = options.includeInactive ?? false;

  return useMemo(
    () =>
      [...renewals, ...addedContracts.filter((added) => !renewals.some((seed) => (seed.id ?? toVendorSlug(seed.vendor)) === added.id))]
        .map((seed) => {
          const slug = seed.id ?? toVendorSlug(seed.vendor);
          const resolution = resolutions[slug];
          const row = assessRenewal(seed, {
            assignedOwner: resolution?.ownerAssigned,
            assignedDecider: resolution?.deciderAssigned,
            departedOwners,
            resolution,
            settings,
            decisionsEnabled: flags.renewalDecisions,
            today,
          });
          return {
            slug,
            row,
            // "Resolved" means the risk is actually closed, not just that a
            // decision was recorded — an escalated or cancellation-pending
            // renewal still has real exposure until someone finishes the job.
            // A decision made on terms that later changed, or for an earlier
            // renewal cycle, no longer closes anything.
            resolved: Boolean(
              resolution?.decision && isDecisionClosed(resolution.decision) && isDecisionCurrent(row, resolution),
            ),
          };
        })
        .filter((entry) => includeInactive || !entry.row.inactive),
    [renewals, addedContracts, resolutions, departedOwners, settings, flags.renewalDecisions, today, includeInactive],
  );
}
