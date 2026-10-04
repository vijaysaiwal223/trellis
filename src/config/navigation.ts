const icon = (name: string) => `/assets/figma/v2/${name}`;

export type NavItem = {
  label: string;
  /** Figma-exported icon, placed with the design's inset (see FigmaIcon). */
  icon: string;
  iconOuter: string;
  iconInner?: string;
  /** Route this item links to. Items without one render inert (no page exists yet). */
  href?: string;
  count?: number;
};

export const navItems: NavItem[] = [
  {
    label: "Renewal decision",
    icon: icon("imgElements.svg"),
    iconOuter: "inset-[5.21%]",
    href: "/",
  },
  {
    label: "Subscriptions",
    icon: icon("imgElements1.svg"),
    iconOuter: "inset-[8.33%_7.54%_8.33%_9.13%]",
    iconInner: "inset-[-4.5%_-4.51%_-4.5%_-4.5%]",
  },
  { label: "People", icon: icon("imgElements2.svg"), iconOuter: "inset-[10.42%_2.08%]" },
  { label: "Spend", icon: icon("imgElements3.svg"), iconOuter: "inset-[5.21%]" },
];

/** The owner's side: the tools they're accountable for. */
export const ownerNavItems: NavItem[] = [
  { label: "My renewals", icon: icon("imgElements.svg"), iconOuter: "inset-[5.21%]", href: "/owner" },
  { label: "Subscriptions", icon: icon("imgElements1.svg"), iconOuter: "inset-[8.33%_7.54%_8.33%_9.13%]", iconInner: "inset-[-4.5%_-4.51%_-4.5%_-4.5%]" },
];
