"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { iconPath } from "@/lib/assets";
import { avatarUrl, people, SIGNED_IN_NAME, teamOf } from "@/config/people";
import { now, stamp } from "@/lib/clock";
import { useSettings } from "@/lib/settings-state";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { addDays, calendarDateIn, daysBetween, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import type { Renewal } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "11 Oct 2026" */
const dayMonthYear = (iso: ISODate) => {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** "Sun 11 Oct" */
const weekdayDayMonth = (iso: ISODate) => {
  const weekday = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const [, month, day] = iso.split("-").map(Number);
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
};

const firstName = (name: string) => name.split(" ")[0];
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const contractWord = (type: Renewal["contractType"]) =>
  type === "Auto-renew" ? "auto" : type === "Manual" ? "manual" : "month-to-month";

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-[4px]">
      <div className="flex h-full items-stretch self-stretch">
        <div className="h-full w-[4px] rounded-full bg-[#f97316]" />
      </div>
      <div className="flex min-w-px flex-1 flex-col gap-[12px] rounded-bl-[4px] rounded-br-[8px] rounded-tl-[4px] rounded-tr-[8px] border-[0.5px] border-solid border-[#fdba74] bg-[#ffedd5] p-[12px]">
        {children}
      </div>
    </div>
  );
}

/**
 * Right-hand drawer for assigning the owner of one renewal. Everything in it comes
 * from the renewal's own facts; the people list is the directory, minus departed staff.
 */
export function AssignOwnerDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { assignOwner, departedOwners } = useRenewalRuntime();
  const { rules } = useSettings();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;

  const [query, setQuery] = useState("");
  const [recommend, setRecommend] = useState(false);
  const [standingOwner, setStandingOwner] = useState(false);

  // Who already owns something in this category, so the picker can suggest them first.
  const ownedByName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of assessed) {
      if (!entry.row.owner) continue;
      map.set(entry.row.owner, [...(map.get(entry.row.owner) ?? []), entry.row.vendor]);
    }
    return map;
  }, [assessed]);

  const candidates = useMemo(() => {
    const directory = people
      .filter((person) => !departedOwners.includes(person.name))
      .map((person) => ({ name: person.name, team: person.team }));
    const list: { name: string; team: string; you: boolean }[] = [
      ...directory.map((person) => ({ ...person, you: false })),
      { name: SIGNED_IN_NAME, team: "Admin", you: true },
    ];
    const sameCategory = (name: string) =>
      assessed.some((entry) => entry.row.owner === name && entry.row.subtitle === row?.subtitle);
    return list
      .map((person) => ({ ...person, suggested: sameCategory(person.name) }))
      .sort((a, b) => Number(b.suggested) - Number(a.suggested));
  }, [assessed, departedOwners, row?.subtitle]);

  const [selected, setSelected] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row) return null;

  const chosen = selected ?? candidates.find((person) => person.suggested)?.name ?? candidates[0]?.name ?? SIGNED_IN_NAME;
  const isYou = chosen === SIGNED_IN_NAME;
  const who = isYou ? "you" : firstName(chosen);
  const today = calendarDateIn(now(), "UTC");
  const askDue = addDays(row.cancelByISO, -rules.askOwnerDaysBefore);
  const dueBy: ISODate = daysBetween(today, askDue) < 0 ? today : askDue;
  const noOwner = row.owner === null;
  const formerOwner = row.formerOwner;
  const yoy = row.yoyPercent;

  const defaultNoteText = `${SIGNED_IN_NAME} made ${who} the owner of ${row.vendor} and needs ${isYou ? "your" : "their"} call by ${weekdayDayMonth(row.decideByISO)}: renew as is, reduce seats, renegotiate or cancel.\n\nThe vendor's notice deadline is ${weekdayDayMonth(row.cancelByISO)}. Usage, price history and seat counts are attached.`;

  const choose = (name: string) => {
    setSelected(name);
    setNoteEdit(null);
  };

  const submit = () => {
    assignOwner(row.id, chosen, {
      ownerRequest: recommend ? { sentAt: stamp(), dueBy, from: SIGNED_IN_NAME } : undefined,
      standingOwner,
    });
    onClose();
  };

  const days = row.daysToCancelBy;
  const windowLine = days < 0 ? "The notice window has already closed." : `${days} day${days === 1 ? "" : "s"} from now.`;
  const visibleCandidates = candidates.filter((person) =>
    `${person.name} ${person.team}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-center gap-[10px]">
          <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-white p-[2px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
            {row.logo ? (
              <img alt="" className="size-full rounded-[5px] object-cover" src={row.logo} />
            ) : (
              <span className="text-[12px] font-medium text-[#52525b]">{row.vendor.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-start gap-[4px]">
              <span className="whitespace-nowrap text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">
                {`Assign an owner for ${row.vendor}`}
              </span>
              {noOwner ? (
                <span className="flex items-center justify-center rounded-full border-[0.5px] border-solid border-[#fdba74] bg-[#ffedd5] px-[6.5px] py-[2.5px] text-[12px] font-medium leading-[16px] tracking-[-0.06px] whitespace-nowrap text-[#9a3412]">
                  No owner
                </span>
              ) : null}
            </div>
            <div className="flex gap-[8px] text-[14px] leading-[16px] tracking-[-0.07px] whitespace-nowrap text-[#52525b]">
              <span>{row.subtitle}</span>
              <span>{`${row.contractAmount}/yr`}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] border border-solid border-[#e4e4e7] bg-[#fafafa] text-[#52525b] hover:bg-[#f4f4f5]"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">
            {`Assign an owner for ${row.vendor}`}
          </span>
          <Callout>
            <span className="text-[14px] font-medium leading-[20px] tracking-[-0.07px] text-[#18181b]">
              Why this need an owner now
            </span>
            <span className="text-[14px] leading-[20px] tracking-[-0.07px] text-[#18181b]">
              {formerOwner && row.ownerStatus === "departed"
                ? `${formerOwner} owned ${row.vendor} but has left the company. `
                : `${row.vendor} has no owner. `}
              {"Nobody is set to make the call before "}
              <span className="font-semibold">{weekdayDayMonth(row.cancelByISO)}</span>
              {`, ${windowLine}`}
            </span>
          </Callout>
          <div className="grid h-[127px] w-full shrink-0 grid-cols-2 grid-rows-2 overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white text-[14px] leading-[20px] whitespace-nowrap">
            <div className="flex flex-col gap-[4px] border-b border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Decided by</span>
              <span className="font-medium text-[#18181b] tracking-[-0.14px]">{dayMonthYear(row.decideByISO)}</span>
            </div>
            <div className="flex flex-col gap-[4px] border-b border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Renews</span>
              <span className="font-medium text-[#18181b] tracking-[-0.14px]">
                {`${dayMonthYear(row.renewalDate)} • ${contractWord(row.contractType)}`}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] border-r border-solid border-[#e4e4e7] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Seat active</span>
              <span className="font-medium text-[#18181b] tracking-[-0.14px]">
                {row.seats
                  ? `${row.seats.active} of ${row.seats.purchased} (${Math.round((row.seats.active / row.seats.purchased) * 100)}%)`
                  : `${row.usage} used`}
              </span>
            </div>
            <div className="flex flex-col gap-[4px] p-[12px]">
              <span className="text-[#52525b] tracking-[-0.07px]">Price change</span>
              <span className="font-medium text-[#18181b] tracking-[-0.14px]">
                {yoy === undefined ? "Not tracked" : `${yoy > 0 ? "+" : ""}${yoy}% vs last year`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          {noOwner && row.daysToCancelBy >= 0 && row.daysToCancelBy <= 2 ? (
            <div role="alert" className="flex flex-col gap-[8px] rounded-[8px] bg-[#ffe4e6] p-[12px] text-[13px] text-[#9f1239]">
              <span className="font-medium">{`Nobody owns ${row.vendor} and ${row.daysToCancelBy} day${row.daysToCancelBy === 1 ? "" : "s"} are left.`}</span>
              <span>You can decide it yourself now, or pick an owner below.</span>
              <button
                type="button"
                onClick={() => {
                  assignOwner(row.id, SIGNED_IN_NAME);
                  onClose();
                }}
                className="h-[32px] w-fit rounded-[6px] bg-white px-[10px] text-[14px] font-medium text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]"
              >
                Decide it myself
              </button>
            </div>
          ) : null}
          {noOwner && row.contractType === "Manual" ? (
            <div className="rounded-[8px] bg-[#ffedd5] p-[12px] text-[13px] text-[#5a2c00]">
              Manual renewal: if nobody acts, it lapses on its own terms.
            </div>
          ) : null}
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">Choose who decides</span>
          <div className="flex w-full flex-col gap-[8px]">
            <label className="flex h-[32px] w-full items-center gap-[8px] rounded-[6px] bg-white px-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
              <img alt="" className="block size-[16px] shrink-0" src={iconPath("search")} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people"
                aria-label="Search people"
                className="min-w-px flex-1 bg-transparent text-[13px] text-[#18181b] outline-none placeholder:text-[#71717a]"
              />
            </label>
            <span className="text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">
              {candidates.some((person) => person.suggested)
                ? `Suggested: people who already own other ${row.subtitle.toLowerCase()} tool`
                : "Anyone in the directory can take this on."}
            </span>
          </div>
          <div role="radiogroup" aria-label="Who decides" className="flex w-full items-stretch overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
            <div className="flex w-[40px] shrink-0 flex-col">
              <div className="h-[40px] border-b border-solid border-[#e4e4e7] bg-[#f4f4f5]" />
              {visibleCandidates.map((person) => (
                <div key={person.name} className="flex h-[56px] items-center justify-center border-b border-solid border-[#e4e4e7] p-[10px]">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={chosen === person.name}
                    aria-label={`Choose ${person.name}`}
                    onClick={() => choose(person.name)}
                    className="relative flex size-[20px] items-center justify-center rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]"
                  >
                    {chosen === person.name ? <span className="size-[8px] rounded-full bg-[#2876f5]" /> : null}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex min-w-px flex-1 flex-col">
              <div className="flex h-[40px] items-center border-b border-solid border-[#e4e4e7] bg-[#f4f4f5] px-[12px] text-[14px] leading-[20px] tracking-[-0.07px] text-[#52525b]">
                People
              </div>
              {visibleCandidates.map((person) => {
                const owns = ownedByName.get(person.name) ?? [];
                return (
                  <button
                    key={person.name}
                    type="button"
                    onClick={() => choose(person.name)}
                    className="flex h-[56px] items-center gap-[12px] overflow-clip border-b border-solid border-[#e4e4e7] px-[12px] py-[8px] text-left hover:bg-[#fafafa]"
                  >
                    <span className="relative flex size-[32px] shrink-0 items-center justify-center overflow-clip rounded-full bg-white p-px shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
                      {person.you ? (
                        <span className="text-[11px] font-medium text-[#52525b]">{initials(person.name)}</span>
                      ) : (
                        <img alt="" className="size-full rounded-full object-cover" src={avatarUrl(person.name)} />
                      )}
                    </span>
                    <span className="flex min-w-px flex-col text-[14px] leading-[20px] whitespace-nowrap">
                      <span className="flex items-center gap-[8px]">
                        <span className="font-medium tracking-[-0.105px] text-[#18181b]">
                          {person.you ? `${person.name} (you)` : person.name}
                        </span>
                        <span className="tracking-[-0.07px] text-[#52525b]">•</span>
                        <span className="tracking-[-0.07px] text-[#52525b]">{person.team ?? teamOf(person.name) ?? ""}</span>
                      </span>
                      <span className="truncate tracking-[-0.07px] text-[#52525b]">
                        {person.you
                          ? "Decide yourself"
                          : owns.length > 0
                            ? `Owns ${owns.join(", ")}`
                            : "No renewals owned yet"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">
            {isYou ? "What you will get" : `What ${firstName(chosen)} will get`}
          </span>
          <textarea
            value={noteEdit ?? defaultNoteText}
            onChange={(event) => setNoteEdit(event.target.value)}
            aria-label="Message to the new owner"
            rows={5}
            className="h-[119px] w-full resize-none rounded-[6px] bg-white px-[8px] py-[6px] text-[14px] leading-[20px] tracking-[-0.07px] text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] outline-none"
          />
          <label className="flex items-start gap-[8px]">
            <input
              type="checkbox"
              checked={recommend}
              onChange={(event) => setRecommend(event.target.checked)}
              className="mt-[2px] size-[16px] shrink-0 accent-[#2876f5]"
            />
            <span className="text-[14px] leading-[20px] text-[#18181b]">
              {`Ask for a recommendation now (due ${rules.askOwnerDaysBefore} days before the deadline)`}
            </span>
          </label>
          <label className="flex items-start gap-[8px]">
            <input
              type="checkbox"
              checked={standingOwner}
              onChange={(event) => setStandingOwner(event.target.checked)}
              className="mt-[2px] size-[16px] shrink-0 accent-[#2876f5]"
            />
            <span className="text-[14px] leading-[20px] text-[#18181b]">
              {`Make ${isYou ? "you" : firstName(chosen)} the owner for future renewals too`}
            </span>
          </label>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-[32px] items-center justify-center rounded-[8px] bg-white px-[10px] text-[14px] font-medium tracking-[-0.105px] text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="relative flex h-[32px] items-center justify-center overflow-clip rounded-[8px] bg-[#2876f5] px-[10px] text-[14px] font-medium tracking-[-0.105px] whitespace-nowrap text-white shadow-[0px_0px_0px_1px_#0a5ce0] hover:bg-[#1f6be6]"
        >
          {isYou ? "Assign yourself and request decision" : `Assign ${firstName(chosen)} and request decision`}
        </button>
      </div>
    </div>
  );
}
