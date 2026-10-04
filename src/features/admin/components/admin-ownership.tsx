"use client";

import { useMemo, useState } from "react";

import { people } from "@/config/people";
import { dayMonthYear } from "@/lib/dates";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useSettings } from "@/lib/settings-state";
import { suggestOwner } from "@/lib/suggest-owner";
import { useAssessedRenewals, renewals } from "@/features/renewal-risk";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Admin: every contract needs one person accountable. Gaps are filled here, one by one or in bulk. */
export function AdminOwnership() {
  const { assignOwner, departedOwners } = useRenewalRuntime();
  const { rules } = useSettings();
  const assessed = useAssessedRenewals(renewals);
  const owned = useMemo(() => assessed.map((entry) => entry.row), [assessed]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOwner, setBulkOwner] = useState<string>("");

  const unassigned = useMemo(
    () => assessed.filter((entry) => !entry.row.owner).sort((a, b) => a.row.decideByISO.localeCompare(b.row.decideByISO)),
    [assessed],
  );
  const left = unassigned.filter((entry) => entry.row.ownerStatus === "departed").length;
  const soon = unassigned.filter((entry) => entry.row.daysToDecideBy >= 0 && entry.row.daysToDecideBy <= 60).length;
  const active = assessed.length - unassigned.length;
  const directory = people.filter((person) => !departedOwners.includes(person.name));
  const allSelected = unassigned.length > 0 && selected.length === unassigned.length;

  const toggle = (slug: string) =>
    setSelected((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));

  const assignSelected = () => {
    if (!bulkOwner) return;
    selected.forEach((slug) => assignOwner(slug, bulkOwner));
    setSelected([]);
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-[16px] p-[24px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[24px] font-semibold text-ui-fg-base">Ownership</h1>
        <p className="text-[14px] text-ui-fg-subtle">
          Every contract needs one person who makes the renewal call. Fix gaps here before they reach the decision queue.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-[12px]">
        {[
          { label: "Subscriptions with an active owner", value: `${active} of ${assessed.length}` },
          { label: "Unassigned", value: String(unassigned.length) },
          { label: "Owner left company", value: String(left) },
          { label: "Decide-by within 60 days, no owner", value: String(soon) },
        ].map((card) => (
          <div key={card.label} className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-ui-border-base bg-white p-[14px_16px]">
            <span className="text-[12px] text-ui-fg-subtle">{card.label}</span>
            <span className="text-[22px] font-medium text-ui-fg-base">{card.value}</span>
          </div>
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-[12px] rounded-[8px] bg-ui-fg-base px-[14px] py-[10px] text-[14px] text-white">
          <span className="font-medium">{`${selected.length} selected`}</span>
          <span className="text-[#d3d3ce]">{usd.format(unassigned.filter((entry) => selected.includes(entry.slug)).reduce((sum, entry) => sum + entry.row.contractValue, 0))} in annual value</span>
          <div className="ml-auto flex items-center gap-[8px]">
            <select
              value={bulkOwner}
              onChange={(event) => setBulkOwner(event.target.value)}
              aria-label="Owner for selected tools"
              className="h-[32px] rounded-[6px] bg-white px-[8px] text-[14px] text-ui-fg-base"
            >
              <option value="">Choose owner…</option>
              {directory.map((person) => (
                <option key={person.name} value={person.name}>{person.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={assignSelected}
              disabled={!bulkOwner}
              className="h-[32px] rounded-[6px] bg-white px-[10px] text-[14px] font-medium text-ui-fg-base disabled:opacity-50"
            >
              {`Assign ${selected.length} tool${selected.length === 1 ? "" : "s"}`}
            </button>
            <button type="button" onClick={() => setSelected([])} className="h-[32px] rounded-[6px] border border-solid border-[#6b6b65] px-[10px] text-[14px] text-white">
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-[8px] border border-solid border-ui-border-base bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-ui-bg-subtle">
            <tr className="text-left text-[12px] text-ui-fg-subtle">
              <th className="px-[12px] py-[10px]">
                <input
                  type="checkbox"
                  aria-label="Select all unassigned"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : unassigned.map((entry) => entry.slug))}
                />
              </th>
              <th className="px-[12px] py-[10px] font-normal">Tool</th>
              <th className="px-[12px] py-[10px] text-right font-normal">Annual value</th>
              <th className="px-[12px] py-[10px] font-normal">Decide by</th>
              <th className="px-[12px] py-[10px] font-normal">Current owner</th>
              <th className="px-[12px] py-[10px] font-normal">Suggested owner</th>
              <th className="px-[12px] py-[10px] font-normal" />
            </tr>
          </thead>
          <tbody>
            {unassigned.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-[12px] py-[24px] text-center text-ui-fg-muted">
                  Every contract has an owner.
                </td>
              </tr>
            ) : null}
            {unassigned.map((entry) => {
              const suggested = suggestOwner(entry.row.subtitle, owned, departedOwners, rules.defaultOwners[entry.row.subtitle]);
              return (
                <tr key={entry.slug} className="border-t border-solid border-ui-border-base">
                  <td className="px-[12px] py-[12px]">
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.row.vendor}`}
                      checked={selected.includes(entry.slug)}
                      onChange={() => toggle(entry.slug)}
                    />
                  </td>
                  <td className="px-[12px] py-[12px]">
                    <div className="flex flex-col">
                      <span className="font-medium text-ui-fg-base">{entry.row.vendor}</span>
                      <span className="text-[12px] text-ui-fg-subtle">{entry.row.subtitle}</span>
                    </div>
                  </td>
                  <td className="px-[12px] py-[12px] text-right text-ui-fg-base">{usd.format(entry.row.contractValue)}</td>
                  <td className="px-[12px] py-[12px] text-ui-fg-base">{dayMonthYear(entry.row.decideByISO)}</td>
                  <td className="px-[12px] py-[12px]">
                    {entry.row.ownerStatus === "departed" && entry.row.formerOwner ? (
                      <div className="flex flex-col">
                        <span className="text-ui-fg-muted line-through">{entry.row.formerOwner}</span>
                        <span className="text-[12px] text-ui-tag-orange-text">Left company</span>
                      </div>
                    ) : (
                      <span className="text-ui-tag-orange-text">Unassigned</span>
                    )}
                  </td>
                  <td className="px-[12px] py-[12px] text-ui-fg-base">{suggested ?? "—"}</td>
                  <td className="px-[12px] py-[12px] text-right">
                    {suggested ? (
                      <button
                        type="button"
                        onClick={() => assignOwner(entry.slug, suggested)}
                        className="h-[32px] rounded-[6px] bg-white px-[10px] text-[14px] font-medium text-ui-fg-base shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-ui-bg-subtle-hover"
                      >
                        {`Assign ${suggested.split(" ")[0]}`}
                      </button>
                    ) : null}
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
