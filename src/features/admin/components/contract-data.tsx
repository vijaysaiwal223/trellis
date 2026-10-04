"use client";

import { useState } from "react";

import { dayMonthYear } from "@/lib/dates";
import { useSettings } from "@/lib/settings-state";
import { useAssessedRenewals, renewals } from "@/features/renewal-risk";
import type { ContractType } from "@/features/renewal-risk/types";

const contractTypes: ContractType[] = ["Auto-renew", "Manual", "Month-to-month"];
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Admin: the renewal terms behind every deadline. Corrections here recalculate the queue. */
export function ContractData() {
  const assessed = useAssessedRenewals(renewals);
  const { overrides, setOverride } = useSettings();
  const [drafts, setDrafts] = useState<Record<string, { noticePeriodDays: string; contractType: ContractType }>>({});

  const corrected = Object.keys(overrides).length;

  return (
    <div className="flex min-h-full w-full flex-col gap-[16px] p-[24px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[24px] font-semibold text-ui-fg-base">Contract data</h1>
        <p className="text-[14px] text-ui-fg-subtle">
          A decide-by date needs both a renewal type and a notice period. Check the order form and correct anything here.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-[12px]">
        <div className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
          <span className="text-[12px] text-ui-fg-subtle">Contracts</span>
          <span className="text-[22px] font-medium text-ui-fg-base">{assessed.length}</span>
        </div>
        <div className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
          <span className="text-[12px] text-ui-fg-subtle">Corrected by an admin</span>
          <span className="text-[22px] font-medium text-ui-fg-base">{corrected}</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-[8px] border border-solid border-ui-border-base bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-ui-bg-subtle">
            <tr className="text-left text-[12px] text-ui-fg-subtle">
              <th className="px-[12px] py-[10px] font-normal">Contract</th>
              <th className="px-[12px] py-[10px] text-right font-normal">Annual value</th>
              <th className="px-[12px] py-[10px] font-normal">Renews</th>
              <th className="px-[12px] py-[10px] font-normal">Renewal type</th>
              <th className="px-[12px] py-[10px] font-normal">Notice (days)</th>
              <th className="px-[12px] py-[10px] font-normal">Decide by</th>
              <th className="px-[12px] py-[10px] font-normal" />
            </tr>
          </thead>
          <tbody>
            {assessed.map((entry) => {
              const row = entry.row;
              const draft = drafts[entry.slug] ?? { noticePeriodDays: String(row.noticeDays), contractType: row.contractType };
              const dirty = draft.noticePeriodDays !== String(row.noticeDays) || draft.contractType !== row.contractType;
              return (
                <tr key={entry.slug} className="border-t border-solid border-ui-border-base">
                  <td className="px-[12px] py-[12px]">
                    <div className="flex flex-col">
                      <span className="font-medium text-ui-fg-base">{row.vendor}</span>
                      <span className="text-[12px] text-ui-fg-subtle">
                        {row.subtitle}
                        {overrides[entry.slug] ? " · corrected" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-[12px] py-[12px] text-right text-ui-fg-base">{usd.format(row.contractValue)}</td>
                  <td className="px-[12px] py-[12px] text-ui-fg-base">{dayMonthYear(row.renewalDate)}</td>
                  <td className="px-[12px] py-[12px]">
                    <select
                      aria-label={`Renewal type for ${row.vendor}`}
                      value={draft.contractType}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [entry.slug]: { ...draft, contractType: event.target.value as ContractType } }))}
                      className="h-[32px] rounded-[6px] border border-solid border-[#bdbdb7] bg-white px-[8px] text-[13px]"
                    >
                      {contractTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-[12px] py-[12px]">
                    <input
                      type="number"
                      min={1}
                      aria-label={`Notice period for ${row.vendor}`}
                      value={draft.noticePeriodDays}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [entry.slug]: { ...draft, noticePeriodDays: event.target.value } }))}
                      className="h-[32px] w-[80px] rounded-[6px] border border-solid border-[#bdbdb7] px-[8px] text-[13px]"
                    />
                  </td>
                  <td className="px-[12px] py-[12px] text-ui-fg-base">{dayMonthYear(row.decideByISO)}</td>
                  <td className="px-[12px] py-[12px] text-right">
                    <button
                      type="button"
                      disabled={!dirty || Number(draft.noticePeriodDays) < 1}
                      onClick={() => {
                        setOverride(entry.slug, { noticePeriodDays: Number(draft.noticePeriodDays), contractType: draft.contractType });
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[entry.slug];
                          return next;
                        });
                      }}
                      className="h-[32px] rounded-[6px] bg-[#2876f5] px-[10px] text-[14px] font-medium text-white disabled:opacity-40"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
