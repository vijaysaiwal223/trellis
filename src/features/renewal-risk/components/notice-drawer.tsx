"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { actionLabel } from "@/features/renewal-detail/types";
import { now, stamp } from "@/lib/clock";
import { dayMonth } from "@/lib/dates";
import { noticeMethods, useRenewalRuntime, type NoticeMethod } from "@/lib/renewal-runtime-state";

import { calendarDateIn, daysBetween, type ISODate } from "../deadlines";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { Badge, Button, IconButton, Input, Label, Select, Textarea } from "@medusajs/ui";
import { Alert } from "@/components/ui/alert";
import { Stepper, renewalJourney } from "@/components/ui/stepper";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMonthYear = (iso: ISODate) => {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/**
 * Written notice for a decision that changes the contract. The decision isn't binding
 * until the vendor has it, so the renewal stays here until the send is recorded.
 */
export function NoticeDrawer({ slug, onClose, onSent }: { slug: string; onClose: () => void; onSent?: (vendor: string) => void }) {
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
    recordNotice(row.id, { sentAt: stamp(), method });
    onSent?.(row.vendor);
    onClose();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-[12px] border border-solid border-[#e4e4e7] bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="flex items-start gap-[10px]">
          <div className="flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white p-[2px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)]">
            {row.logo ? (
              <img alt="" src={row.logo} className="size-full rounded-[5px] object-cover" />
            ) : (
              <span className="text-[12px] font-medium text-[#52525b]">{row.vendor.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="text-[16px] font-medium leading-[20px] tracking-[-0.16px] text-[#18181b]">{`Send notice to ${row.vendor}`}</span>
              <Badge color="orange" size="xsmall">Send notice</Badge>
            </div>
            <span className="text-[14px] leading-[16px] text-[#52525b]">
              {`Decision: ${decision.targetOutcome ?? actionLabel(decision.action)} • recorded by you, ${dayMonth(decision.recordedAt?.slice(0, 10) ?? today)}`}
            </span>
          </div>
        </div>
        <IconButton variant="transparent" size="small" aria-label="Close" onClick={onClose}>
          <RiCloseLine className="size-4" />
        </IconButton>
      </div>

      <Stepper steps={renewalJourney} current={3} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-[16px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium leading-[20px] text-[#18181b]">{`Notice must reach ${row.vendor} by ${dayMonthYear(row.decideByISO)}`}</span>
          <Alert status="Warning">{`The decision isn’t binding until ${row.vendor} receives written notice. This stays in your queue until you confirm it was sent ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`}</Alert>
        </div>

        <div className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">1. Copy the notice</span>
          <span className="text-[14px] leading-[20px] text-[#18181b]">Draft from your decision. Fill in the bracketed parts from your contract.</span>
          <Textarea
            value={body}
            onChange={(event) => setText(event.target.value)}
            aria-label="Notice text"
            rows={9}
          />
          <div>
            <Button variant="secondary" size="small" onClick={copy}>
              {copied ? "Copied" : "Copy text"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">2. Send it the way your contract requires</span>
          <span className="text-[14px] leading-[20px] text-[#18181b]">
            Usually email to your account executive or the vendor&apos;s renewal portal. Trellis doesn&apos;t send notice for you.
          </span>
        </div>

        <div className="flex flex-col gap-[12px] p-[16px]">
          <span className="text-[14px] font-medium text-[#18181b]">3. Record that it was sent</span>
          <div className="grid grid-cols-2 gap-[8px]">
            <div className="flex flex-col gap-[6px]">
              <Label size="small" weight="regular">Date sent</Label>
              <Input value={dayMonthYear(today)} readOnly />
            </div>
            <div className="flex flex-col gap-[6px]">
              <Label size="small" weight="regular">Sent via</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as NoticeMethod)}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {noticeMethods.map((option) => (
                    <Select.Item key={option} value={option}>{option}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[12px] border-t border-solid border-[#e4e4e7] bg-[#fafafa] px-[16px] py-[12px]">
        <Button variant="secondary" size="small" onClick={onClose}>
          Save, send later
        </Button>
        <Button variant="primary" size="small" onClick={markSent}>
          Mark notice sent
        </Button>
      </div>
    </div>
  );
}
