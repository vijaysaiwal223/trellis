"use client";

import { TooltipProvider } from "@medusajs/ui";
import { useEffect, useMemo, type ReactNode } from "react";

import { buildAiPortfolioFacts } from "@/features/renewal-detail/ai-portfolio";
import { useRightPanel, RightPanelProvider } from "./right-panel-state";
import { AiAssistantPanel, type AiAssistantPanelContext } from "@/features/renewal-detail/components/ai-assistant-panel";
import { renewals } from "@/features/renewal-risk/mock-data";
import { useAssessedRenewals } from "@/features/renewal-risk/use-assessed-renewals";

import { AiAssistantProvider, useAiAssistant } from "./ai-assistant-state";
import { ProfileProvider } from "./profile-state";
import { Sidebar } from "./sidebar";

/** App chrome shared by every route: top header, side navigation, content, and AI. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <AiAssistantProvider>
        <RightPanelProvider>
          <AppShellContent>{children}</AppShellContent>
        </RightPanelProvider>
      </AiAssistantProvider>
    </ProfileProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const { isOpen, close } = useAiAssistant();
  const { panel, panelWidth } = useRightPanel();
  const assessed = useAssessedRenewals(renewals);
  const portfolioFacts = useMemo(() => buildAiPortfolioFacts(assessed), [assessed]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, close]);

  const context: AiAssistantPanelContext = { kind: "portfolio", facts: portfolioFacts };

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
              context={context}
              onClose={close}
            />
          </div>
        ) : panel ? (
          <div className="flex h-full shrink-0 flex-col" style={{ width: panelWidth }}>{panel}</div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
