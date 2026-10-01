import {
  RiDashboardLine,
  RiHistoryLine,
  RiSettings3Line,
  RiStackLine,
  RiTeamLine,
  type RemixiconComponentType,
} from "@remixicon/react";

export type NavItem = {
  label: string;
  icon: RemixiconComponentType;
  /** Route this item links to. Items without one render inert (no page exists yet). */
  href?: string;
  count?: number;
};

export const navItems: NavItem[] = [
  {
    label: "Renewal Risk",
    icon: RiDashboardLine,
    href: "/",
  },
  { label: "Subscriptions", icon: RiStackLine },
  { label: "Owners", icon: RiTeamLine },
  { label: "Activity", icon: RiHistoryLine },
  { label: "Settings", icon: RiSettings3Line, href: "/settings" },
];
