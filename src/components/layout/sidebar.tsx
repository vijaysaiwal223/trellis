"use client";

import { navItems } from "@/config/navigation";
import { renewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { NavButton } from "./nav-button";

export function Sidebar() {
  const { resolutions } = useRenewalRuntime();
  const pendingCount = renewals.filter(
    (row) => !resolutions[toVendorSlug(row.vendor)]?.decision,
  ).length;

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
