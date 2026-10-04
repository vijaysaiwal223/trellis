"use client";

import { TooltipProvider } from "@medusajs/ui";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

import { buildAiPortfolioFacts } from "@/features/renewal-detail/ai-portfolio";
import { buildAiSuggestionFacts } from "@/features/renewal-detail/ai-suggestion";
import { useRightPanel, RightPanelProvider } from "./right-panel-state";
import { AiAssistantPanel, type AiAssistantPanelContext } from "@/features/renewal-detail/components/ai-assistant-panel";
import { genericRenewalDetails } from "@/features/renewal-detail/generic-detail";
import { renewalDetails } from "@/features/renewal-detail/mock-data";
import { renewals } from "@/features/renewal-risk/mock-data";
import { useAssessedRenewals } from "@/features/renewal-risk/use-assessed-renewals";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { AiAssistantProvider, useAiAssistant } from "./ai-assistant-state";
import { ProfileProvider } from "./profile-state";
import { SettingsProvider } from "@/lib/settings-state";
import { Sidebar } from "./sidebar";

const allRenewalDetails = { ...renewalDetails, ...genericRenewalDetails };

/** App chrome shared by every route: top header, side navigation, content, and AI. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <SettingsProvider>
        <AiAssistantProvider>
          <RightPanelProvider>
            <AppShellContent>{children}</AppShellContent>
          </RightPanelProvider>
        </AiAssistantProvider>
      </SettingsProvider>
    </ProfileProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isOpen, close, suggestions, setSuggestion, requestReview } = useAiAssistant();
  const { panel } = useRightPanel();
  const { resolutions, departedOwners } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const portfolioFacts = useMemo(() => buildAiPortfolioFacts(assessed, allRenewalDetails), [assessed]);
  const slug = /^\/renewals\/([^/]+)$/.exec(pathname ?? "")?.[1];
  const detail = slug ? renewalDetails[slug] ?? genericRenewalDetails[slug] : undefined;
  const assessedRow = assessed.find((entry) => entry.slug === slug)?.row;
  const originalOwner = detail?.ownership.find((row) => row.label === "Current owner")?.value;
  const ownerDeparted = !resolutions[slug ?? ""]?.ownerAssigned && !!originalOwner && departedOwners.includes(originalOwner);
  const ownerName = resolutions[slug ?? ""]?.ownerAssigned ?? (ownerDeparted ? undefined : originalOwner);
  const vendorFacts = detail ? buildAiSuggestionFacts(detail, assessedRow, ownerName, ownerDeparted) : null;
  const suggestionKey = vendorFacts ? JSON.stringify(vendorFacts) : "";
  const suggestion = slug && suggestions[slug]?.key === suggestionKey ? suggestions[slug].value : null;

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, close]);

  const context: AiAssistantPanelContext = detail && vendorFacts && slug
    ? {
        kind: "vendor",
        facts: vendorFacts,
        fallbackText: detail.recommendation.description,
        suggestion,
        onSuggestion: (value) => setSuggestion(slug, suggestionKey, value),
        onReview: () => requestReview(slug),
      }
    : { kind: "portfolio", facts: portfolioFacts };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full gap-[4px] overflow-hidden bg-[#030303] p-[4px] text-ui-fg-base">
        <Sidebar />
        <div className="relative flex min-w-px flex-1 flex-col overflow-hidden rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
        {/* Bruno opens in the same side slot as the other drawers. */}
        {isOpen ? (
          <div className="flex h-full w-[400px] shrink-0 flex-col">
            <AiAssistantPanel
              key={detail ? suggestionKey : "portfolio"}
              context={context}
              onClose={close}
            />
          </div>
        ) : panel ? (
          <div className="flex h-full w-[400px] shrink-0 flex-col">{panel}</div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
