"use client";

import { useState } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { dayMonthYear } from "@/lib/dates";
import { stamp } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewals } from "../mock-data";
import { DrawerFrame, primaryButton, secondaryButton } from "./drawer-frame";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * Edge case: notice was sent to change the contract, but the vendor's invoice doesn't
 * reflect it. The notice record is the evidence, so the drawer builds the dispute from it.
 */
export function DisputeDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { resolutions, logVendorResponse, assignOwner, confirmDecision } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const row = assessed.find((entry) => entry.slug === slug)?.row;
  const decision = resolutions[slug]?.decision;
  const [billedSeats, setBilledSeats] = useState("");
  const [charged, setCharged] = useState("");

  if (!row || !decision || !decision.noticeSentAt) return null;

  const target = decision.targetOutcome ?? "the agreed change";
  const targetSeats = Number(/(\d+) seats/.exec(target)?.[1]);
  const billed = Number(billedSeats);
  const difference = billed && targetSeats && row.seats ? Math.max(0, (billed - targetSeats) * (row.contractValue / row.seats.purchased)) : undefined;
  const draft = [
    "Hello [account executive name],",
    "",
    `Our payment of ${charged || "[amount]"} covers ${billedSeats || "[seats]"} ${row.vendor} seats. On ${dayMonthYear(decision.noticeSentAt.slice(0, 10))} we gave notice to ${target.toLowerCase()}${decision.vendorReference ? ` (reference ${decision.vendorReference})` : ""}.`,
    "",
    "Please issue a corrected invoice and refund the difference.",
    "",
    "Regards,",
    SIGNED_IN_NAME,
  ].join("\n");

  return (
    <DrawerFrame
      logo={row.logo}
      vendor={`${row.vendor} didn't apply your change`}
      subtitle={`${row.subtitle} · Owner: ${row.owner ?? "none"}`}
      badge={<span className="rounded-full border-[0.5px] border-solid border-[#fda4af] bg-[#ffe4e6] px-[6.5px] py-[2.5px] text-[12px] font-medium text-[#9f1239]">Needs follow-up</span>}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={() => { confirmDecision(row.id, { ...decision, confirmedAt: stamp(), note: "Vendor applied the change." }); onClose(); }} className={secondaryButton}>
            The vendor fixed it
          </button>
          <button
            type="button"
            onClick={() => {
              assignOwner(row.id, SIGNED_IN_NAME);
            }}
            className={secondaryButton}
          >
            Assign to me
          </button>
          <button
            type="button"
            onClick={() => {
              logVendorResponse(row.id, `Disputed: billed ${billedSeats || "unknown"} seats${charged ? ` for ${charged}` : ""}; decision was ${target}.`);
              void navigator.clipboard?.writeText(draft).catch(() => undefined);
              onClose();
            }}
            className={primaryButton}
          >
            Copy and mark as disputed
          </button>
        </>
      }
    >
      <section className="flex flex-col gap-[12px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <div className="rounded-[6px] bg-[#ffe4e6] p-[10px] text-[13px] leading-[20px] text-[#5c1a1a]">
          {`You decided to ${target.toLowerCase()} and sent notice. The next invoice doesn't reflect it. Your notice record is the evidence you need.`}
        </div>
        <dl className="grid grid-cols-2 gap-[12px_16px] text-[14px]">
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Decision</dt>
            <dd className="font-medium">{target}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Notice sent</dt>
            <dd className="font-medium">{`${dayMonthYear(decision.noticeSentAt.slice(0, 10))}${decision.noticeMethod ? ` · ${decision.noticeMethod.toLowerCase()}` : ""}`}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Reference</dt>
            <dd className="font-medium">{decision.vendorReference ?? "None recorded"}</dd>
          </div>
          <div className="flex flex-col gap-[2px]">
            <dt className="text-[12px] text-[#52525b]">Recorded by</dt>
            <dd className="font-medium">{decision.ownerName ?? SIGNED_IN_NAME}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-[10px] border-b border-solid border-[#e4e4e7] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">What {row.vendor} charged</span>
        <div className="grid grid-cols-2 gap-[10px]">
          <label className="flex flex-col gap-[4px] text-[13px] font-medium">
            Seats billed
            <input value={billedSeats} onChange={(event) => setBilledSeats(event.target.value)} inputMode="numeric" className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[13px] font-normal" />
          </label>
          <label className="flex flex-col gap-[4px] text-[13px] font-medium">
            Amount charged
            <input value={charged} onChange={(event) => setCharged(event.target.value)} placeholder="$180,000" className="h-[36px] rounded-[6px] border border-solid border-[#bdbdb7] px-[10px] text-[13px] font-normal" />
          </label>
        </div>
        {difference !== undefined ? (
          <span className="text-[13px] text-[#18181b]">{`About ${usd.format(difference)} more than the agreed seats cost.`}</span>
        ) : null}
      </section>

      <section className="flex flex-col gap-[10px] p-[16px]">
        <span className="text-[14px] font-medium text-[#18181b]">Dispute draft</span>
        <textarea readOnly value={draft} rows={9} aria-label="Dispute draft" className="rounded-[6px] border border-solid border-[#bdbdb7] p-[10px] text-[13px] leading-[20px]" />
      </section>
    </DrawerFrame>
  );
}
