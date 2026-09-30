import { TooltipProvider } from "@medusajs/ui";
import type { ReactNode } from "react";

import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

/** App chrome shared by every route: top header, side navigation, main panel. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col  overflow-hidden rounded-[16px] bg-ui-bg-subtle  text-ui-fg-base">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
