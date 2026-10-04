"use client";

import { useState } from "react";

import { people } from "@/config/people";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";
import { useSettings, type RenewalRules, type ReminderTiming } from "@/lib/settings-state";
import { useAssessedRenewals, renewals } from "@/features/renewal-risk";

const reminderLabels: Record<ReminderTiming, string> = {
  after_overdue: "The day after it's overdue",
  on_due: "On the due date",
  never: "Never",
};

/** Admin: when owners are asked, when they're reminded, and who covers each category. */
export function RenewalRulesForm() {
  const { rules, setRules } = useSettings();
  const { departedOwners } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const categories = [...new Set(assessed.map((entry) => entry.row.subtitle))].sort();
  const directory = people.filter((person) => !departedOwners.includes(person.name));
  const [draft, setDraft] = useState<RenewalRules>(rules);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);

  const update = (patch: Partial<RenewalRules>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const save = () => {
    setRules(draft);
    setSaved(true);
  };

  const row = "grid grid-cols-2 items-start gap-[16px] border-t border-solid border-ui-border-base py-[14px]";

  return (
    <div className="flex min-h-full w-full flex-col gap-[16px] p-[24px]">
      <div className="flex items-end gap-[16px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[24px] font-semibold text-ui-fg-base">Renewal rules</h1>
          <p className="text-[14px] text-ui-fg-subtle">When contracts enter the queue, when owners are asked, and what happens when nobody answers.</p>
        </div>
        <div className="ml-auto flex items-center gap-[8px]">
          {saved ? <span className="text-[13px] text-ui-tag-green-text">Saved</span> : null}
          <button type="button" onClick={() => setDraft(rules)} disabled={!dirty} className="h-[36px] rounded-[6px] bg-white px-[12px] text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(0,0,0,0.08)] disabled:opacity-40">
            Discard
          </button>
          <button type="button" onClick={save} disabled={!dirty} className="h-[36px] rounded-[6px] bg-[#2876f5] px-[12px] text-[14px] font-medium text-white disabled:opacity-40">
            Save changes
          </button>
        </div>
      </div>

      <section className="flex flex-col rounded-[10px] border border-solid border-ui-border-base bg-white px-[24px] py-[20px]">
        <h2 className="text-[16px] font-semibold text-ui-fg-base">Owner recommendations</h2>
        <div className={row}>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-medium">Ask owner for a recommendation</span>
            <span className="text-[13px] text-ui-fg-subtle">How many days before the decide-by date the owner&apos;s answer is due.</span>
          </div>
          <label className="flex items-center gap-[8px] text-[13px]">
            <input type="number" min={1} value={draft.askOwnerDaysBefore} onChange={(event) => update({ askOwnerDaysBefore: Number(event.target.value) })} aria-label="Days before decide-by to ask the owner" className="h-[36px] w-[80px] rounded-[6px] border border-solid border-[#bdbdb7] px-[8px]" />
            days before decide-by
          </label>
        </div>
        <div className={row}>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-medium">Escalate to the renewal lead</span>
            <span className="text-[13px] text-ui-fg-subtle">If the owner still hasn&apos;t answered, the lead decides alone from the usage data.</span>
          </div>
          <label className="flex items-center gap-[8px] text-[13px]">
            <input type="number" min={0} value={draft.escalateAfterDays} onChange={(event) => update({ escalateAfterDays: Number(event.target.value) })} aria-label="Days after the due date to escalate" className="h-[36px] w-[80px] rounded-[6px] border border-solid border-[#bdbdb7] px-[8px]" />
            days after the due date
          </label>
        </div>
        <div className={row}>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-medium">Remind owners</span>
            <span className="text-[13px] text-ui-fg-subtle">One reminder only, so it isn&apos;t ignored.</span>
          </div>
          <select value={draft.reminder} onChange={(event) => update({ reminder: event.target.value as ReminderTiming })} aria-label="Reminder timing" className="h-[36px] max-w-[320px] rounded-[6px] border border-solid border-[#bdbdb7] bg-white px-[8px] text-[13px]">
            {(Object.keys(reminderLabels) as ReminderTiming[]).map((option) => (
              <option key={option} value={option}>{reminderLabels[option]}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="flex flex-col rounded-[10px] border border-solid border-ui-border-base bg-white px-[24px] py-[20px]">
        <h2 className="text-[16px] font-semibold text-ui-fg-base">Queue</h2>
        <div className={row}>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-medium">Skip month-to-month</span>
            <span className="text-[13px] text-ui-fg-subtle">Month-to-month contracts can be cancelled any time, so they stay out of the decision queue.</span>
          </div>
          <label className="flex items-center gap-[8px] text-[13px]">
            <input type="checkbox" checked={draft.skipMonthToMonth} onChange={(event) => update({ skipMonthToMonth: event.target.checked })} />
            Leave month-to-month out of the queue
          </label>
        </div>
      </section>

      <section className="flex flex-col rounded-[10px] border border-solid border-ui-border-base bg-white px-[24px] py-[20px]">
        <h2 className="text-[16px] font-semibold text-ui-fg-base">Default owners by category</h2>
        <p className="text-[13px] text-ui-fg-subtle">Used first when suggesting an owner for an unassigned tool in that category.</p>
        <div className="mt-[12px] overflow-hidden rounded-[8px] border border-solid border-ui-border-base">
          <table className="w-full text-[14px]">
            <thead className="bg-ui-bg-subtle">
              <tr className="text-left text-[12px] text-ui-fg-subtle">
                <th className="px-[12px] py-[10px] font-normal">Category</th>
                <th className="px-[12px] py-[10px] font-normal">Default owner</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category} className="border-t border-solid border-ui-border-base">
                  <td className="px-[12px] py-[10px]">{category}</td>
                  <td className="px-[12px] py-[10px]">
                    <select
                      aria-label={`Default owner for ${category}`}
                      value={draft.defaultOwners[category] ?? ""}
                      onChange={(event) => {
                        const next = { ...draft.defaultOwners };
                        if (event.target.value) next[category] = event.target.value;
                        else delete next[category];
                        update({ defaultOwners: next });
                      }}
                      className="h-[32px] rounded-[6px] border border-solid border-[#bdbdb7] bg-white px-[8px] text-[13px]"
                    >
                      <option value="">No default</option>
                      {directory.map((person) => (
                        <option key={person.name} value={person.name}>{person.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
