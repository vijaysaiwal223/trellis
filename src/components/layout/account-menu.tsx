"use client";

import Image from "next/image";
import Link from "next/link";
import { Text, clx } from "@medusajs/ui";
import { RiArrowDownSLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

const VIJAY_AVATAR = "/assets/vijay-saiwal.jpg";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        className={clx(
          "flex h-9 shrink-0 items-center gap-2 rounded-full bg-ui-bg-base py-1 pl-1 pr-2.5 shadow-borders-base hover:bg-ui-bg-base-hover",
          open && "ring-2 ring-ui-bg-interactive-soft",
        )}
      >
        <Image
          src={VIJAY_AVATAR}
          alt="Vijay Saiwal"
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-col items-start leading-tight">
          <Text as="span" className="truncate text-[13px] font-medium leading-4 text-ui-fg-base">
            Vijay Saiwal
          </Text>
          <Text as="span" className="truncate text-[11px] leading-4 text-ui-fg-subtle">
            Admin
          </Text>
        </div>
        <RiArrowDownSLine className="size-4 shrink-0 text-ui-fg-muted" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[44px] z-50 flex w-[220px] flex-col overflow-hidden rounded-[8px] bg-ui-bg-base py-1 shadow-elevation-flyout"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Image
              src={VIJAY_AVATAR}
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-full object-cover"
            />
            <div className="flex min-w-0 flex-col">
              <Text as="span" className="truncate text-[14px] font-medium leading-5 text-ui-fg-base">
                Vijay Saiwal
              </Text>
              <Text as="span" className="truncate text-[12px] leading-4 text-ui-fg-muted">
                Admin
              </Text>
            </div>
          </div>
          <div className="my-1 border-t border-ui-border-base" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-left text-[14px] leading-5 text-ui-fg-base hover:bg-ui-bg-subtle-hover"
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-left text-[14px] leading-5 text-ui-fg-base hover:bg-ui-bg-subtle-hover"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
