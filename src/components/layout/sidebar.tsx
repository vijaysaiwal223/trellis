"use client";

import { navItems } from "@/config/navigation";
import { renewals } from "@/features/renewal-risk";
import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { NavButton } from "./nav-button";

export function Sidebar() {
  const { resolutions } = useRenewalRuntime();
  // A draft, or a decision still awaiting real-world follow-through
  // (cancellation, negotiation, escalation), still needs attention here.
  const pendingCount = renewals.filter((row) => {
    const decision = resolutions[toVendorSlug(row.vendor)]?.decision;
    return !decision || !isDecisionClosed(decision);
  }).length;

  return (
    <aside className="-mr-px flex w-[240px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-ui-border-base bg-ui-bg-base">
      <nav className="flex flex-col gap-2 px-2 py-3">
        {navItems.map((item) => (
          <NavButton
            key={item.label}
            item={item.label === "Renewal Risk" ? { ...item, count: pendingCount || undefined } : item}
          />
        ))}
      </nav>
    </aside>
  );
}
