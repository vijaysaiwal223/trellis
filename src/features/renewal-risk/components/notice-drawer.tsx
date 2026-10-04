"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { actionLabel } from "@/features/renewal-detail/types";
import { now, stamp } from "@/lib/clock";
import { noticeMethods, useRenewalRuntime, type NoticeMethod } from "@/lib/renewal-runtime-state";

import { calendarDateIn, daysBetween, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMonthYear = (iso: ISODate) => {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

const steps = ["Decided", "Send notice", "Handled"] as const;

/**
 * Written notice for a decision that changes the contract. The decision isn't binding
 * until the vendor has it, so the renewal stays here until the send is recorded.
 */
export function NoticeDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, recordNotice } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const decision = resolutions[slug]?.decision;

  const draft = useMemo(() => {
    if (!row || !decision) return "";
    const change =
      decision.action === "Right-size"
        ? `reduce ${row.vendor} licenses from ${row.seats?.purchased ?? "current"} to ${decision.targetOutcome?.match(/\d+/)?.[0] ?? "the new number of"} seats`
        : `cancel ${row.vendor}`;
    return [
      "Hello [account executive name],",
      "",
      `This is formal notice under our order form [order form number] that ${change}, effective at renewal on ${dayMonthYear(row.renewalDate)}.`,
      "",
      "Please send an updated order form reflecting this change.",
      "",
      "Regards,",
      `${SIGNED_IN_NAME}`,
    ].join("\n");
  }, [row, decision]);

  const [text, setText] = useState<string | null>(null);
  const [method, setMethod] = useState<NoticeMethod>(noticeMethods[0]);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!row || !decision) return null;

  const today = calendarDateIn(now(), "UTC");
  const daysLeft = daysBetween(today, row.decideByISO);
  const body = text ?? draft;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const markSent = () => {
    recordNotice(row.id, { sentAt: stamp(), method, reference: reference || undefined });
    onClose();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-center gap-[6px]">
            <span className="text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">{`Send notice to ${row.vendor}`}</span>
            <span className="rounded-full border-[0.5px] border-solid border-[#fdba74] bg-[#ffedd5] px-[6.5px] py-[2.5px] text-[12px] font-medium leading-[16px] whitespace-nowrap text-[#9a3412]">
              Send notice
            </span>
          </div>
          <span className="text-[14px] leading-[16px] text-[#52525b]">{`Decision: ${actionLabel(decision.action)}${decision.targetOutcome ? ` (${decision.targetOutcome})` : ""}`}</span>
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

      <ol className="flex shrink-0 items-center gap-[8px] border-b border-solid border-[#e4e4e7] px-[16px] py-[12px] text-[12px]">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-[6px]">
            <span
              className={`flex size-[20px] items-center justify-center rounded-full text-[11px] ${
                index === 0 ? "bg-[#065f46] text-white" : index === 1 ? "bg-[#2563eb] text-white" : "bg-[#f4f4f5] text-[#52525b]"
              }`}
            >
              {index === 0 ? "✓" : index + 1}
            </span>
            <span className={index === 1 ? "font-medium text-[#18181b]" : "text-[#52525b]"}>{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] text-[#18181b]">{`Notice must reach ${row.vendor} by ${dayMonthYear(row.decideByISO)}`}</span>
          <div className="rounded-[6px] bg-[#ffedd5] p-[10px] text-[13px] leading-[20px] text-[#5a2c00]">
            {`The decision isn't binding until ${row.vendor} receives written notice. This stays in your queue until you confirm it was sent. ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`}
          </div>
          {daysLeft >= 0 && daysLeft <= 3 ? (
            <div role="alert" className="rounded-[6px] bg-[#ffe4e6] p-[10px] text-[13px] font-medium text-[#9f1239]">
              {`Reminder: the notice is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Send it before ${dayMonthYear(row.decideByISO)}.`}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">1. Copy the notice</span>
          <textarea
            value={body}
            onChange={(event) => setText(event.target.value)}
            aria-label="Notice text"
            rows={9}
            className="w-full resize-y rounded-[6px] bg-white px-[10px] py-[8px] text-[13px] leading-[20px] text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] outline-none"
          />
          <div>
            <button type="button" onClick={copy} className="h-[32px] rounded-[8px] bg-white px-[10px] text-[14px] font-medium text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5]">
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">2. Send it the way your contract requires</span>
          <span className="text-[13px] leading-[20px] text-[#18181b]">
            Usually email to your account executive or the vendor&apos;s renewal portal. Trellis doesn&apos;t send notice for you.
          </span>
        </div>

        <div className="flex flex-col gap-[10px] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">3. Record that it was sent</span>
          <div className="grid grid-cols-2 gap-[10px]">
            <label className="flex flex-col gap-[4px] text-[13px] font-medium text-[#18181b]">
              Date sent
              <input value={dayMonthYear(today)} readOnly className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[13px] font-normal text-[#18181b]" />
            </label>
            <label className="flex flex-col gap-[4px] text-[13px] font-medium text-[#18181b]">
              Sent via
              <select value={method} onChange={(event) => setMethod(event.target.value as NoticeMethod)} className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] bg-white px-[8px] text-[13px] font-normal text-[#18181b]">
                {noticeMethods.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-[4px] text-[13px] font-medium text-[#18181b]">
            Confirmation <span className="font-normal text-[#52525b]">optional, e.g. the vendor&apos;s reply</span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Reference or reply ID"
              className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[13px] font-normal text-[#18181b]"
            />
          </label>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <button type="button" onClick={onClose} className="h-[32px] rounded-[8px] bg-white px-[10px] text-[14px] font-medium text-[#18181b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-[#f4f4f5]">
          Save, send later
        </button>
        <button type="button" onClick={markSent} className="h-[32px] rounded-[8px] bg-[#2876f5] px-[10px] text-[14px] font-medium whitespace-nowrap text-white shadow-[0px_0px_0px_1px_#0a5ce0] hover:bg-[#1f6be6]">
          Mark notice sent
        </button>
      </div>
    </div>
  );
}
