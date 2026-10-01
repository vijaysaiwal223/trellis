"use client";

import { Text } from "@medusajs/ui";
import { RiSparkling2Line } from "@remixicon/react";

import { DotmSquare4 } from "@/components/ui/dotm-square-4";

const GRADIENT_BG = "linear-gradient(90deg, #ffedd5 0%, #ffe4e6 33%, #ede9fe 66%, #dbeafe 100%)";
const GRADIENT_TEXT = "linear-gradient(90deg, #9a3412 0%, #9f1239 33%, #5b21b6 66%, #1e40af 100%)";

export function AiSuggestionCard({
  text,
  reasoning,
  confidence,
  action,
  loading = false,
}: {
  text: string;
  reasoning?: string;
  confidence?: number;
  action?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        className="flex min-h-[96px] w-full items-center rounded-lg border-[0.5px] border-black/10 px-3 py-3"
        style={{ backgroundImage: GRADIENT_BG }}
        aria-busy="true"
      >
        <div className="flex items-center gap-3">
          <DotmSquare4 size={28} dotSize={4} color="#9a3412" ariaLabel="Generating renewal insight" />
          <Text as="span" aria-hidden="true" className="text-[14px] font-medium text-ui-fg-subtle">
            Generating renewal insight…
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-center rounded-lg border-[0.5px] border-black/10 px-3 py-3"
      style={{ backgroundImage: GRADIENT_BG }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex w-full items-start gap-2">
          <RiSparkling2Line className="size-[17px] shrink-0 text-ui-tag-orange-text" />
          <Text
            as="span"
            className="min-w-0 flex-1 bg-clip-text text-[14px] font-medium leading-5 text-transparent"
            style={{ backgroundImage: GRADIENT_TEXT }}
          >
            {text}
          </Text>
        </div>
        {reasoning ? (
          <Text as="span" className="w-full text-[14px] leading-5 text-ui-fg-subtle">
            {reasoning}
          </Text>
        ) : null}
        {action ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-ui-border-base bg-white/70 px-2 py-0.5 text-[12px] font-medium text-ui-fg-base">
              Suggested: {action}
            </span>
            {confidence !== undefined ? (
              <Text as="span" className="text-[12px] text-ui-fg-subtle">
                {confidence}% confidence
              </Text>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
