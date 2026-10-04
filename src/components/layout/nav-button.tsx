"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/config/navigation";

import { FigmaIcon } from "./figma-icon";

export function NavButton({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href
    ? item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;

  const content = (
    <>
      <span className="relative size-[20px] shrink-0">
        <FigmaIcon src={item.icon} outer={item.iconOuter} inner={item.iconInner} />
      </span>
      <span
        className={`relative shrink-0 whitespace-nowrap text-[14px] leading-[20px] tracking-[-0.07px] ${active ? "text-white" : "text-[#a1a1aa]"}`}
      >
        {item.label}
      </span>
      {typeof item.count === "number" ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-[4px] border-[0.5px] border-[#be123c] bg-[#f43f5e] px-1 text-[11px] font-medium leading-4 text-white">
          {item.count}
        </span>
      ) : null}
    </>
  );

  const base = "relative flex h-[32px] w-full shrink-0 items-center gap-[8px] overflow-clip rounded-[8px] px-[8px] py-[6px]";

  if (!item.href) {
    return <div className={`${base} opacity-60`} aria-disabled="true">{content}</div>;
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${base} ${active ? "bg-[#27272a]" : "hover:bg-[#18181b]"}`}
    >
      {content}
    </Link>
  );
}
