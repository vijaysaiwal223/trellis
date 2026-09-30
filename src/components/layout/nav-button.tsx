"use client";

import { Badge, Button, Text, clx } from "@medusajs/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AssetIcon } from "@/components/ui/asset-icon";
import type { NavItem } from "@/config/navigation";

export function NavButton({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href
    ? item.href === "/"
      ? pathname === "/" || pathname.startsWith("/renewals")
      : pathname === item.href
    : false;

  const content = (
    <>
      <AssetIcon src={item.icon} alt="" />
      <Text as="span" className="min-w-0 truncate text-[14px] leading-5">
        {item.label}
      </Text>
      {typeof item.count === "number" ? (
        <Badge
          size="2xsmall"
          rounded="base"
          className="ml-0 !flex !h-4 !min-w-4 !items-center !justify-center !border-0 !bg-ui-tag-red-icon px-1 text-[11px] font-bold leading-4 !text-white"
        >
          {item.count}
        </Badge>
      ) : null}
    </>
  );

  return (
    <Button
      type="button"
      asChild={Boolean(item.href)}
      variant="transparent"
      aria-pressed={active}
      disabled={!item.href}
      className={clx(
        "!flex !h-8 !w-full !items-center !justify-start gap-2 rounded-[8px] px-2 py-0 text-[14px] font-normal leading-5 !shadow-none after:hidden",
        active
          ? "!bg-ui-bg-interactive-soft !text-ui-fg-interactive hover:!bg-ui-bg-interactive-soft"
          : "!bg-transparent !text-ui-fg-subtle hover:!bg-ui-bg-subtle",
        !item.href && "!cursor-default opacity-60",
      )}
    >
      {item.href ? <Link href={item.href}>{content}</Link> : content}
    </Button>
  );
}
