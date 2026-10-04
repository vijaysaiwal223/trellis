"use client";

import { useAiAssistant } from "./ai-assistant-state";

// The glow is the design's own layered gradient, kept verbatim so the button matches the frame.
const glowLight =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 122 32' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(1.3517e-15 -2.16 6.1228 1.0994e-14 60.667 16)'><stop stop-color='rgba(89,149,247,1)' offset='0'/><stop stop-color='rgba(49,113,216,1)' offset='0.5'/><stop stop-color='rgba(29,94,201,1)' offset='0.75'/><stop stop-color='rgba(9,76,185,1)' offset='1'/></radialGradient></defs></svg>\")";
const glowHighlight =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 122 32' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.44999998807907104'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(-4.4924 -2.6194e-15 3.0935e-15 -1.3349 60.667 32)'><stop stop-color='rgba(254,199,255,1)' offset='0'/><stop stop-color='rgba(160,131,247,0)' offset='1'/></radialGradient></defs></svg>\")";

export function AskBrunoButton() {
  const { isOpen, open } = useAiAssistant();
  return (
    <button
      type="button"
      onClick={open}
      aria-expanded={isOpen}
      aria-controls="renewal-ai-panel"
      className="relative flex shrink-0 items-center justify-center gap-[6px] overflow-clip rounded-[8px] py-[6px] pl-[12px] pr-[16px] shadow-[0px_0px_0px_1px_#2876f5,0px_2px_2px_0px_rgba(89,149,247,0.08),0px_5px_10px_0px_rgba(89,149,247,0.12)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[8px]">
        <div className="absolute inset-0 rounded-[8px]" style={{ backgroundImage: glowLight }} />
        <div className="absolute inset-0 rounded-[8px] mix-blend-plus-lighter" style={{ backgroundImage: glowHighlight }} />
      </div>
      <span className="relative size-[20px] shrink-0">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/figma/v2/imgBloom.svg" />
      </span>
      <span className="relative shrink-0 whitespace-nowrap font-medium text-[14px] leading-[20px] text-white">Ask Bruno</span>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_2px_0px_rgba(255,255,255,0.5),inset_0px_-1px_2px_0px_rgba(255,255,255,0.1),inset_0px_0px_5px_0px_rgba(255,255,255,0.2),inset_0px_-10px_40px_0px_rgba(255,255,255,0.22),inset_0px_5px_12px_0px_rgba(255,255,255,0.24)]"
      />
    </button>
  );
}
