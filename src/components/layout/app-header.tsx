"use client";

import { BorderBeam } from "border-beam";
import Image from "next/image";
import { Text } from "@medusajs/ui";
import { RiSparkling2Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { iconPath } from "@/lib/assets";

import { AccountMenu } from "./account-menu";
import { useAiAssistant } from "./ai-assistant-state";
import { NotificationMenu } from "./notification-menu";

export function AppHeader() {
  const { isOpen, open } = useAiAssistant();
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
        <BorderBeam size="pulse-inner" theme="light" colorVariant="ocean" strength={0.5} active={!isOpen} borderRadius={6} className="shrink-0 rounded-md">
          <Button variant="secondary" size="base" onClick={open} aria-expanded={isOpen} aria-controls="renewal-ai-panel"
            leftIcon={<RiSparkling2Line className="size-4 text-ui-fg-interactive" />}>
            Ask AI
          </Button>
        </BorderBeam>
        <NotificationMenu />
        <AccountMenu />
      </div>
    </header>
  );
}
