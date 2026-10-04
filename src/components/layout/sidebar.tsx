"use client";

import { adminNavItems, navItems, ownerNavItems } from "@/config/navigation";
import { renewals } from "@/features/renewal-risk";
import { isDecisionClosed, useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { toVendorSlug } from "@/lib/vendor-slug";

import { AccountMenu } from "./account-menu";
import { NavButton } from "./nav-button";
import { useProfile } from "./profile-state";

export function Sidebar() {
  const { resolutions } = useRenewalRuntime();
  const { profile } = useProfile();
  const items = profile === "owner" ? ownerNavItems : profile === "admin" ? adminNavItems : navItems;
  // A draft, or a decision still awaiting real-world follow-through
  // (cancellation, negotiation, escalation), still needs attention here.
  const pendingCount = renewals.filter((row) => {
    const decision = resolutions[toVendorSlug(row.vendor)]?.decision;
    return !decision || !isDecisionClosed(decision);
  }).length;

  return (
    <aside className="relative flex h-full w-[220px] shrink-0 flex-col overflow-clip rounded-[12px]">
      <div className="flex w-full flex-col items-start px-[8px] py-[12px]">
        <div className="flex items-center gap-[8px]">
          <div className="relative h-[24px] w-[42px] shrink-0 overflow-clip">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/figma/v2/imgLogo.svg" />
          </div>
          <p className="font-heading text-[24px] font-bold leading-[32px] tracking-[-0.12px] whitespace-nowrap text-white">
            Trellis
          </p>
        </div>
      </div>
      <nav className="flex w-full flex-col gap-[8px] px-[8px] py-[12px]">
        {items.map((item) => (
          <NavButton
            key={item.label}
            item={item.href === "/" ? { ...item, count: pendingCount || undefined } : item}
          />
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 w-[220px] p-[8px]">
        <AccountMenu />
      </div>
    </aside>
  );
}
