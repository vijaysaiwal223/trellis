import Image from "next/image";
import { Text } from "@medusajs/ui";

import { iconPath } from "@/lib/assets";

import { AccountMenu } from "./account-menu";
import { HeaderSearch } from "./header-search";
import { NotificationMenu } from "./notification-menu";

export function AppHeader() {
  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between px-4 py-3">
      <div className="flex shrink-0 items-center gap-2">
        <Image
          src={iconPath("trellis-mark")}
          alt="Trellis"
          width={42}
          height={24}
          priority
        />
        <Text as="span" className="font-heading text-[24px] font-bold leading-8 text-ui-fg-base">
          Trellis
        </Text>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 pl-4">
        <HeaderSearch />
        <NotificationMenu />
        <AccountMenu />
      </div>
    </header>
  );
}
