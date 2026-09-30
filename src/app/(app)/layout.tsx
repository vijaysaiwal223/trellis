import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

/** Chrome (sidebar, top nav) for every in-app route. The `/decide` route sits outside this group — it simulates a no-login link opened from email/Slack, so it renders without Trellis's own navigation. */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
