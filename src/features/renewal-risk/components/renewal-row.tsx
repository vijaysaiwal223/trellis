"use client";

import Link from "next/link";

import { useRenewalRuntime, type RenewalResolution } from "@/lib/renewal-runtime-state";

import { actionLabel } from "@/features/renewal-detail/types";


import { resolveRenewalDisplay } from "../resolve-display";
import { renewalStage, stageLabel, type RenewalStage } from "../stage";
import type { BadgeColor, Renewal } from "../types";
import { Badge, Button } from "@medusajs/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "3 Oct" — day first, three-letter month, as the design writes dates. */
const dayMonth = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

const dayMonthYear = (iso: string) => `${dayMonth(iso)} ${iso.slice(0, 4)}`;

function relativeDays(days: number) {
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

const DECISION_WORDING: Record<string, string> = {
  Renew: "Renew as is",
  Renegotiate: "Renegotiated",
  "Right-size": "Downsized",
  Cancel: "Cancelled",
};

/**
 * The note under each status badge, as the status table defines it. Stages outside that
 * table (ready for notice, awaiting outcome) keep the task's own due line.
 */
function statusNote(
  stage: RenewalStage,
  row: Renewal,
  resolution: RenewalResolution | undefined,
  fallback: string,
) {
  switch (stage) {
    case "locked-in":
      return "Deadline passed";
    case "no-owner":
      if (row.ownerStatus === "departed") return "Owner left company";
      if (row.contractType === "Manual") return "Manual: lapses if ignored";
      return "";
    case "awaiting-owner":
      return resolution?.ownerRequest ? `Asked ${dayMonth(resolution.ownerRequest.sentAt.slice(0, 10))}` : "Not asked yet";
    case "recommendation-in":
      return resolution?.recommendation
        ? (resolution.recommendation.targetOutcome ?? actionLabel(resolution.recommendation.action))
        : fallback;
    case "ready-for-notice": {
      const decidedOn = resolution?.decision?.recordedAt;
      return decidedOn ? `Decided ${dayMonth(decidedOn.slice(0, 10))}` : fallback;
    }
    case "awaiting-outcome": {
      // Notice is out; the renewal stays open until the vendor's outcome is confirmed.
      const sent = resolution?.decision?.noticeSentAt;
      return sent ? `Notice sent ${dayMonth(sent.slice(0, 10))}` : fallback;
    }
    case "handled": {
      const decided = resolution?.decision;
      if (!decided) return fallback;
      const wording = DECISION_WORDING[decided.action] ?? actionLabel(decided.action);
      const when = decided.confirmedAt ?? decided.recordedAt;
      return when ? `${wording} · ${dayMonth(when.slice(0, 10))}` : wording;
    }
    default:
      return fallback;
  }
}

const stageColor: Record<RenewalStage, BadgeColor> = {
  "no-owner": "orange",
  "awaiting-owner": "grey",
  "recommendation-in": "blue",
  "locked-in": "red",
  "ready-for-notice": "blue",
  "awaiting-outcome": "blue",
  handled: "green",
};

/** Seat usage as a ring. The arc is drawn at the same radius and stroke as the design's gauge. */
function SeatGauge({ percent }: { percent: number }) {
  const radius = 16.2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(percent, 100) / 100) * circumference;
  const color = percent >= 80 ? "#10b981" : percent >= 50 ? "#f97316" : "#f43f5e";
  return (
    <div className="relative size-[36px] shrink-0">
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e4e4e7" strokeWidth="3.6" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3.6"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold leading-none text-[#18181b]">
        {percent}
      </span>
    </div>
  );
}

const cell = "flex h-[64px] shrink-0 items-center overflow-clip border-b border-solid border-[#e4e4e7] px-[12px] py-[10px]";

export function RenewalRow({
  row: baseRow,
  selected = false,
  onAssign,
  onOpen,
}: {
  row: Renewal;
  /** The row whose drawer is open. */
  selected?: boolean;
  onAssign?: () => void;
  /** Opens the drawer that matches this row's status. */
  onOpen?: () => void;
}) {
  const { resolutions } = useRenewalRuntime();
  const resolution = resolutions[baseRow.id];
  const { row, href, task } = resolveRenewalDisplay(baseRow, resolution);
  const stage = renewalStage(row, resolution);
  const usagePercent = parseInt(row.usage, 10) || 0;
  const yoy = row.yoyPercent;
  const decideLate = row.daysToDecideBy < 0;
  const decideSoon = !decideLate && row.daysToDecideBy <= 7;
  const dueTone = decideLate ? "text-[#9f1239]" : decideSoon ? "text-[#9a3412]" : "text-[#18181b]";

  return (
    <div className={`flex w-full items-start ${selected ? "bg-[#f0f6fe] shadow-[inset_2px_0_0_0_#2876f5]" : ""}`}>
      <div className="flex w-[200px] shrink-0 items-center gap-[12px] overflow-clip border-b border-solid border-[#e4e4e7] p-[12px]">
        <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-white p-px shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
          {row.logo ? (
            <img alt="" className="size-full rounded-[5px] object-cover" src={row.logo} />
          ) : (
            <span className="text-[12px] font-medium text-[#52525b]">{row.vendor.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
        <span className="flex min-w-px flex-1 flex-col items-start text-[14px] leading-[20px] tracking-[-0.105px]">
          <span className="w-full truncate font-medium text-[#18181b]">{row.vendor}</span>
          <span className="w-full truncate text-[#52525b]">{row.subtitle}</span>
        </span>
      </div>

      <div className={`${cell} w-[104px] text-[14px] leading-[20px] tracking-[-0.105px] ${dueTone}`}>
        <span className="flex flex-col">
          <span>{dayMonth(row.decideByISO)}</span>
          <span className="whitespace-nowrap">{relativeDays(row.daysToDecideBy)}</span>
        </span>
      </div>

      <div className={`${cell} w-[200px] text-[14px] leading-[20px] tracking-[-0.105px] text-[#18181b]`}>
        <span className="flex flex-col whitespace-nowrap">
          <span>{dayMonthYear(row.renewalDate)}</span>
          <span className="text-[#71717a]">{`${row.contractType} · ${row.noticeDays}-day notice`}</span>
        </span>
      </div>

      <div className={`${cell} w-[112px] justify-end text-[14px] leading-[20px] tracking-[-0.105px] text-[#18181b]`}>
        <span>{row.contractAmount}</span>
      </div>

      <div className={`${cell} w-[120px] gap-[12px]`}>
        <SeatGauge percent={usagePercent} />
        <span className="whitespace-nowrap text-[14px] leading-[20px] tracking-[-0.105px] text-[#18181b]">
          {row.seats ? `${row.seats.active}/${row.seats.purchased}` : row.usage}
        </span>
      </div>

      <div
        className={`${cell} w-[64px] justify-end text-[14px] leading-[20px] tracking-[-0.105px] ${
          yoy === undefined ? "text-[#71717a]" : yoy >= 10 ? "text-[#9a3412]" : "text-[#18181b]"
        }`}
      >
        <span className="whitespace-nowrap">{yoy === undefined ? "—" : `${yoy > 0 ? "+" : ""}${yoy}%`}</span>
      </div>

      <div className={`${cell} min-w-[100px] flex-1 items-center text-[14px] leading-[20px] tracking-[-0.105px]`}>
        <span className="flex min-w-px flex-1 flex-col items-start whitespace-nowrap">
          {row.owner ? (
            <>
              <span className="text-[#18181b]">{row.owner}</span>
              {row.team ? <span className="text-[#71717a]">{row.team}</span> : null}
            </>
          ) : row.ownerStatus === "departed" ? (
            <>
              <span className="text-[#71717a] line-through">{row.formerOwner}</span>
              <span className="text-[#9a3412]">Left company</span>
            </>
          ) : (
            <span className="text-[#9a3412]">Unassigned</span>
          )}
        </span>
      </div>

      <div className={`${cell} w-[152px] flex-col items-start justify-center gap-[4px] px-[8px]`}>
        <Badge color={stageColor[stage]} size="xsmall" className="whitespace-nowrap">
          {stageLabel[stage]}
        </Badge>
        <span className="max-w-full truncate whitespace-nowrap text-[14px] leading-[20px] tracking-[-0.105px] text-[#52525b]">
          {statusNote(stage, row, resolution, task.due)}
        </span>
      </div>

      <div className={`${cell} w-[100px]`}>
        {task.kind === "assign" && onAssign ? (
          <Button variant="secondary" size="small" onClick={onAssign} aria-expanded={selected}>
            Assign
          </Button>
        ) : onOpen ? (
          <Button variant="secondary" size="small" onClick={onOpen} aria-expanded={selected}>
            Open
          </Button>
        ) : (
          <Button asChild variant="secondary" size="small">
            <Link href={href}>Open</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
