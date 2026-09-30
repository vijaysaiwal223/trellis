"use client";

import { IconButton, Input } from "@medusajs/ui";
import { X } from "lucide-react";
import { useState } from "react";

import { AssetIcon } from "@/components/ui/asset-icon";
import { iconPath } from "@/lib/assets";

export function HeaderSearch() {
  const [search, setSearch] = useState("");
  const hasQuery = search.trim().length > 0;

  return (
    <div className="relative h-8 w-[260px]">
      <AssetIcon
        src={iconPath("search")}
        alt=""
        className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2"
      />
      <Input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search across the trellis"
        aria-label="Search across the trellis"
        className="!h-8 !w-[260px] !rounded-full !border-0 !bg-ui-bg-subtle-hover py-0 pl-9 pr-9 text-[14px] font-normal leading-5 !text-ui-fg-muted !shadow-none outline-none placeholder:!text-ui-fg-muted focus-visible:!shadow-[0_0_0_2px_var(--color-ui-tag-blue-border)]"
      />
      {hasQuery ? (
        <IconButton
          type="button"
          variant="transparent"
          size="2xsmall"
          aria-label="Clear search"
          onClick={() => setSearch("")}
          className="!absolute right-1 top-1/2 !flex !h-6 !w-6 -translate-y-1/2 !items-center !justify-center rounded-full !bg-transparent !text-ui-fg-muted !shadow-none hover:!bg-ui-border-base after:hidden"
        >
          <X className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
    </div>
  );
}
