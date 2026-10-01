import { Avatar, Text, clx } from "@medusajs/ui";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { detailTabs, type DetailTab } from "../constants";
import type { RenewalDetail } from "../types";
import { OwnerNudgePreview } from "./owner-nudge-preview";

type DetailHeaderProps = {
  detail: RenewalDetail;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onReviewRenewal: () => void;
  /** Is there someone currently accountable to nudge? */
  hasActiveOwner: boolean;
  onOpenAssignOwner: () => void;
};

export function DetailHeader({
  detail,
  activeTab,
  onTabChange,
  onReviewRenewal,
  hasActiveOwner,
  onOpenAssignOwner,
}: DetailHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-6 p-4 pb-0">
      <div className="flex items-center gap-1 text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-subtle">
        <Link href="/" className="hover:text-ui-fg-base hover:underline">
          Applications
        </Link>
        <Text as="span">/</Text>
        <Text as="span" className="text-ui-fg-base">
          {detail.vendor}
        </Text>
      </div>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            src={detail.logo}
            fallback={detail.vendor.slice(0, 2).toUpperCase()}
            variant="squared"
            size="large"
          />
          <div>
            <Text as="div" className="text-[16px] font-medium leading-5 tracking-[-0.16px] text-ui-fg-base">
              {detail.vendor}
            </Text>
            <Text as="div" className="text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-subtle">
              {detail.subtitle}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveOwner ? (
            <OwnerNudgePreview detail={detail} />
          ) : (
            <Button variant="secondary" size="base" onClick={onOpenAssignOwner}>
              Assign owner
            </Button>
          )}
          <Button variant="primary" size="base" onClick={onReviewRenewal}>
            Review Renewal
          </Button>
        </div>
      </div>
      <div className="flex h-10 w-full items-start gap-2 border-b border-ui-border-base">
        {detailTabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <div
              key={tab}
              className={clx(
                "flex items-center justify-center overflow-hidden pb-2",
                active && "border-b-2 border-ui-bg-interactive",
              )}
            >
              <button
                type="button"
                onClick={() => onTabChange(tab)}
                className={clx(
                  "flex items-center justify-center rounded px-2 py-1.5",
                  active && "bg-ui-bg-interactive-soft",
                )}
              >
                <Text
                  as="span"
                  className={clx(
                    "text-[14px] font-medium leading-5",
                    active ? "text-ui-fg-interactive" : "text-ui-fg-muted",
                  )}
                >
                  {tab}
                </Text>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
