"use client";

import { navItems } from "@/config/navigation";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";

import { NavButton } from "./nav-button";

export function Sidebar() {
  // A draft, a decision re-opened by changed terms, or one still awaiting
  // real-world follow-through (cancellation, negotiation, escalation) still
  // needs attention here.
  const pendingCount = useAssessedRenewals(renewals).filter((entry) => !entry.resolved).length;

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
