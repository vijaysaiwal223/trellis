import { iconPath } from "@/lib/assets";

export type NavItem = {
  label: string;
  icon: string;
  /** Route this item links to. Items without one render inert (no page exists yet). */
  href?: string;
  count?: number;
};

export const navItems: NavItem[] = [
  {
    label: "Renewal Risk",
    icon: iconPath("nav-renewal"),
    href: "/",
  },
  { label: "Subscriptions", icon: iconPath("nav-subscriptions") },
  { label: "Owners", icon: iconPath("nav-owners") },
  { label: "Activity", icon: iconPath("nav-activity") },
  { label: "Settings", icon: iconPath("nav-settings"), href: "/settings" },
];
