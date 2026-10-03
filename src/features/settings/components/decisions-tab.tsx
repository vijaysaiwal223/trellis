"use client";

import { Switch, Text, clx } from "@medusajs/ui";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { people } from "@/config/people";
import { isValidISODate, type ISODate } from "@/features/renewal-risk/deadlines";
import { parseContractsCsv, type CsvImportResult } from "@/features/renewal-risk/csv-import";
import { buildDigest, planDigest } from "@/features/renewal-risk/digest";
import { planNudges, stepLabel } from "@/features/renewal-risk/escalation";
import { renewals } from "@/features/renewal-risk/mock-data";
import { useAssessedRenewals } from "@/features/renewal-risk/use-assessed-renewals";
import { stamp } from "@/lib/clock";
import { flagLabels, type FlagName } from "@/lib/flags";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { SettingsCard } from "./settings-ui";

const inputClass = "h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none";

const TIME_ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <Text as="span" className="text-[13px] font-medium leading-4 text-ui-fg-base">{label}</Text>
      {children}
      {hint ? <Text as="span" className="text-[12px] leading-4 text-ui-fg-muted">{hint}</Text> : null}
    </label>
  );
}

function NumberField({ label, hint, value, min, max, onCommit }: { label: string; hint?: string; value: number; min: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isInteger(parsed) && parsed >= min && parsed <= max;
  return (
    <Field label={label} hint={valid || draft === String(value) ? hint : `Whole number from ${min} to ${max}.`}>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        aria-invalid={!valid}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value.trim() !== "" && Number.isInteger(next) && next >= min && next <= max) onCommit(next);
        }}
        className={clx(inputClass, !valid && "border-ui-border-error")}
      />
    </Field>
  );
}

export function DecisionsTab({ notify }: { notify: (message: string) => void }) {
  const { settings, updateSettings, flags, setFlag, outbox, appendOutbox, integrations, today, resolutions, addedContracts, addContracts, resetDemo, setInactive } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const endedContracts = useAssessedRenewals(renewals, { includeInactive: true }).filter((entry) => entry.row.inactive);

  const [holidayText, setHolidayText] = useState(settings.holidays.join("\n"));
  const holidayLines = holidayText.split(/[\s,]+/).filter(Boolean);
  const badHolidays = holidayLines.filter((entry) => !isValidISODate(entry));

  const digestRows = useMemo(() => assessed.map(({ slug, row }) => ({ row, resolution: resolutions[slug] })), [assessed, resolutions]);
  const digest = useMemo(() => buildDigest(digestRows, settings, today), [digestRows, settings, today]);
  const lastDigest = [...outbox].reverse().find((entry) => entry.step === "digest");
  // What the daily limit is holding back right now (it goes out on the next day).
  const held = useMemo(
    () => planNudges({ rows: digestRows, settings, outbox, integrations, today, sentAt: "" }).held.filter((entry) => entry.reason === "daily-limit"),
    [digestRows, settings, outbox, integrations, today],
  );
  const recent = [...outbox].filter((entry) => entry.step !== "digest").reverse().slice(0, 12);

  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<CsvImportResult | null>(null);

  const existing = useMemo(() => assessed.map(({ row }) => ({ id: row.id, vendor: row.vendor, renewalDate: row.renewalDate })), [assessed]);

  const sendDigest = () => {
    const entry = planDigest({ rows: digestRows, settings, outbox, integrations, today, sentAt: stamp(), force: true });
    if (!entry) {
      notify("Set a finance lead first — the digest has nobody to go to.");
      return;
    }
    appendOutbox([entry]);
    notify(`Digest recorded for ${entry.recipient}. Simulated: nothing was delivered.`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <SettingsCard title="Decision rules" description="How decide-by dates are worked out and who hears about them.">
        <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2">
          <NumberField label="Decision lead time (days)" hint="Decide-by is this many days before the notice deadline. A contract can override it." value={settings.leadTimeDays} min={0} max={120} onCommit={(value) => updateSettings({ leadTimeDays: value })} />
          <NumberField label="Assumed notice period (days)" hint="Used, and labeled as assumed, when a contract's notice terms are unknown." value={settings.defaultNoticeDays} min={1} max={365} onCommit={(value) => updateSettings({ defaultNoticeDays: value })} />
          <Field label="Finance lead" hint="Gets escalations from T-14, hand-offs and the weekly digest.">
            <select value={settings.financeLead ?? ""} onChange={(event) => updateSettings({ financeLead: event.target.value || null })} className={inputClass}>
              <option value="">None set</option>
              {people.map((person) => <option key={person.name} value={person.name}>{person.name} — {person.team}</option>)}
            </select>
          </Field>
          <Field label="Organization time zone" hint="Decides what 'today' is for deadlines and nudges.">
            <select value={settings.orgTimeZone} onChange={(event) => updateSettings({ orgTimeZone: event.target.value })} className={inputClass}>
              {[...new Set([settings.orgTimeZone, ...TIME_ZONES])].map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </Field>
          <NumberField label="Snoozes allowed per contract" hint="Snoozing never silences decide-by day." value={settings.snoozeLimit} min={0} max={10} onCommit={(value) => updateSettings({ snoozeLimit: value })} />
          <NumberField label="Nudges per person per day" hint="Extra nudges wait for the next day, most urgent first." value={settings.dailyNudgeLimit} min={1} max={20} onCommit={(value) => updateSettings({ dailyNudgeLimit: value })} />
          <div className="sm:col-span-2">
            <Field label="Company holidays" hint={badHolidays.length > 0 ? `Not a YYYY-MM-DD date: ${badHolidays.join(", ")}` : "One per line (YYYY-MM-DD). Internal deadlines roll back to the previous business day."}>
              <textarea
                value={holidayText}
                rows={3}
                aria-invalid={badHolidays.length > 0}
                onChange={(event) => {
                  setHolidayText(event.target.value);
                  const lines = event.target.value.split(/[\s,]+/).filter(Boolean);
                  if (lines.every(isValidISODate)) updateSettings({ holidays: [...new Set(lines)].sort() as ISODate[] });
                }}
                className={clx("w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 text-[14px] outline-none", badHolidays.length > 0 && "border-ui-border-error")}
              />
            </Field>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Weekly finance digest" description="One summary per week for the finance lead. Delivery is simulated in this prototype.">
        <div className="flex flex-col gap-3 p-3">
          <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <Text as="p" className="text-[13px] font-semibold text-ui-fg-base">{digest.subject}</Text>
            <div className="mt-2 flex flex-col gap-2">
              {digest.sections.map((section) => (
                <div key={section.title}>
                  <Text as="p" className="text-[12px] font-medium text-ui-fg-base">{section.title}</Text>
                  <ul className="mt-0.5 list-disc pl-5 text-[12px] leading-4 text-ui-fg-subtle">
                    {section.lines.slice(0, 5).map((entry) => <li key={entry}>{entry}</li>)}
                    {section.lines.length > 5 ? <li>and {section.lines.length - 5} more</li> : null}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text as="span" className="text-[13px] text-ui-fg-subtle">
              {settings.financeLead
                ? lastDigest ? `Last recorded for ${lastDigest.recipient} on ${lastDigest.sentAt.slice(0, 10)} (week of ${lastDigest.scheduledFor}).` : `Goes to ${settings.financeLead}; nothing recorded yet.`
                : "No finance lead set — nobody receives this."}
            </Text>
            <Button variant="secondary" size="small" onClick={sendDigest}>Send now</Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Nudge log" description="Everything the escalation ladder has 'sent'. Slack or Teams if connected, otherwise email. Nothing leaves this browser.">
        {held.length > 0 ? (
          <Text as="p" className="border-b border-ui-border-base bg-ui-tag-orange-bg px-3 py-2 text-[12px] leading-4 text-ui-tag-orange-text">
            {held.length} nudge{held.length === 1 ? " is" : "s are"} held by the daily limit and go out tomorrow: {held.map((entry) => `${assessed.find((item) => item.slug === entry.contractId)?.row.vendor ?? entry.contractId} → ${entry.recipient}`).join(", ")}.
          </Text>
        ) : null}
        {recent.length === 0 ? (
          <Text as="p" className="p-3 text-[13px] text-ui-fg-subtle">Nothing sent yet.</Text>
        ) : (
          <ul className="divide-y divide-ui-border-base">
            {recent.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <Text as="p" className="truncate text-[13px] font-medium text-ui-fg-base">{entry.subject}</Text>
                  <Text as="p" className="text-[12px] text-ui-fg-subtle">{stepLabel(entry.step)} · to {entry.recipient} ({entry.role === "decider" ? "decider" : "finance lead"}) via {entry.channel}</Text>
                </div>
                <Text as="span" className="shrink-0 text-[12px] text-ui-fg-muted">
                  {entry.ackedAt ? "Acknowledged" : entry.usedAt ? "Link used" : "Sent"}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard title="Import contracts" description="Paste a CSV with vendor, renewal_date, annual_value and optionally notice_days, currency, owner, auto_renew.">
        <div className="flex flex-col gap-3 p-3">
          <textarea
            value={csv}
            rows={5}
            placeholder={"vendor,renewal_date,notice_days,annual_value,currency,owner\nAcme,2027-02-01,45,12000,EUR,Rohan Mehta"}
            onChange={(event) => { setCsv(event.target.value); setParsed(null); }}
            className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 py-1.5 font-mono text-[12px] outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="small" disabled={!csv.trim()} onClick={() => setParsed(parseContractsCsv(csv, existing))}>Check</Button>
            <Button
              variant="primary"
              size="small"
              disabled={!parsed || parsed.seeds.length === 0}
              onClick={() => {
                if (!parsed) return;
                addContracts(parsed.seeds);
                notify(`Imported ${parsed.seeds.length} contract${parsed.seeds.length === 1 ? "" : "s"}.${parsed.seeds.some((seed) => seed.noticePeriodDays === null) ? " Those without notice terms are now blind spots." : ""}`);
                setCsv("");
                setParsed(null);
              }}
            >
              Import {parsed ? parsed.seeds.length : ""}
            </Button>
            {addedContracts.length > 0 ? <Text as="span" className="text-[12px] text-ui-fg-muted">{addedContracts.length} imported so far</Text> : null}
          </div>
          {parsed ? (
            <div className="flex flex-col gap-1 text-[13px]">
              <Text as="p" className="text-ui-fg-base">{parsed.seeds.length} ready · {parsed.duplicates.length} duplicate · {parsed.errors.length} with errors</Text>
              {parsed.duplicates.map((entry) => <Text key={entry.line} as="p" className="text-ui-fg-subtle">Line {entry.line}: {entry.vendor} with that renewal date already exists — skipped.</Text>)}
              {parsed.errors.map((entry) => <Text key={`${entry.line}-${entry.message}`} as="p" className="text-ui-fg-error">Line {entry.line}: {entry.message}</Text>)}
            </div>
          ) : null}
        </div>
      </SettingsCard>

      {endedContracts.length > 0 ? (
        <SettingsCard title="Ended contracts" description="Marked as cancelled or finished. They get no reminders and are left out of the queue, digest and metrics.">
          <ul className="divide-y divide-ui-border-base">
            {endedContracts.map(({ row }) => (
              <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <Text as="span" className="text-[14px] text-ui-fg-base">{row.vendor}</Text>
                <Button variant="secondary" size="small" onClick={() => setInactive(row.id, false)}>Track again</Button>
              </li>
            ))}
          </ul>
        </SettingsCard>
      ) : null}

      <SettingsCard title="Prototype flags" description="Switch the new behavior off to see the original cancel-by workflow.">
        <div className="divide-y divide-ui-border-base">
          {(Object.keys(flagLabels) as FlagName[]).map((name) => (
            <div key={name} className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="flex min-w-0 flex-col">
                <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">{flagLabels[name].title}</Text>
                <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">{flagLabels[name].description}</Text>
              </div>
              <Switch checked={flags[name]} onCheckedChange={(value) => setFlag(name, value)} aria-label={flagLabels[name].title} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="flex flex-col">
              <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">Reset demo data</Text>
              <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">Clears recorded decisions, nudges, imported contracts and departures in this browser. Settings and flags stay.</Text>
            </div>
            <Button variant="danger" size="small" onClick={() => { resetDemo(); notify("Demo data reset."); }}>Reset</Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
