"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  defaultIntegrations,
  type IntegrationId,
  type IntegrationSettings,
} from "@/config/integrations";
import { calendarDateIn, type ISODate } from "@/features/renewal-risk/deadlines";
import {
  defaultOrgSettings,
  isDecisionClosed,
  type AnalyticsEvent,
  type DecisionEvent,
  type DecisionRecord,
  type OrgSettings,
  type OutboxEntry,
  type RenewalOutcome,
  type RenewalResolution,
  type TermsOverride,
} from "@/features/renewal-risk/decision-model";
import type { RenewalSeed } from "@/features/renewal-risk/types";
import { defaultFlags, type FlagName, type Flags } from "@/lib/flags";
import { now, stamp } from "@/lib/clock";
import { parseSnapshot } from "@/lib/runtime-snapshot";

// The decision model lives in the renewal-risk feature; re-exported so existing imports keep working.
export { isDecisionClosed };
export type { DecisionEvent, DecisionRecord, RenewalResolution };

/** v1 is read once and migrated; it is never rewritten, so rolling back loses nothing. */
const STORAGE_KEY = "trellis-renewal-runtime-v2";
const LEGACY_STORAGE_KEY = "trellis-renewal-runtime-v1";

const MAX_OUTBOX = 500;
const MAX_EVENTS = 1000;

type RenewalRuntimeContextValue = {
  /** False until the browser store has been read; anything that writes state waits for it. */
  ready: boolean;
  /** Keyed by contract id (the vendor slug unless a seed sets its own). */
  resolutions: Record<string, RenewalResolution>;
  assignOwner: (slug: string, name: string) => void;
  /** Names who decides; separate from the person who runs the tool. */
  assignDecider: (slug: string, name: string) => void;
  confirmDecision: (slug: string, decision: DecisionRecord) => void;
  /** Confirmed notice terms, typed in or extracted from a contract. */
  setTerms: (slug: string, terms: Omit<TermsOverride, "confirmedAt">) => void;
  setLeadTimeOverride: (slug: string, days: number | null) => void;
  acknowledge: (slug: string, step: string) => void;
  /** Returns false when the snooze limit has been reached. */
  snooze: (slug: string, until: ISODate) => boolean;
  recordOutcome: (slug: string, cycle: ISODate, outcome: RenewalOutcome) => void;
  setInactive: (slug: string, inactive: boolean) => void;
  toggleTask: (slug: string, taskId: string) => void;
  /** People who have left the company; tools they own count as unowned. */
  departedOwners: string[];
  markDeparted: (name: string) => void;
  reinstateOwner: (name: string) => void;
  /** Policy: when an owner departs, hand their tools to a colleague automatically. */
  autoHandoff: boolean;
  setAutoHandoff: (value: boolean) => void;
  /** Prototype settings for future external alerts; no delivery is connected. */
  integrations: Record<IntegrationId, IntegrationSettings>;
  updateIntegration: (id: IntegrationId, patch: Partial<IntegrationSettings>) => void;
  settings: OrgSettings;
  updateSettings: (patch: Partial<OrgSettings>) => void;
  flags: Flags;
  setFlag: (name: FlagName, value: boolean) => void;
  /** Today in the org's time zone, from the shared clock. */
  today: ISODate;
  /** Every nudge the simulated delivery layer has "sent". There is no real delivery. */
  outbox: OutboxEntry[];
  appendOutbox: (entries: OutboxEntry[]) => void;
  markTokenUsed: (token: string) => void;
  events: AnalyticsEvent[];
  logEvent: (event: Omit<AnalyticsEvent, "at">) => void;
  /** Contracts added by CSV import or contract upload, on top of the built-in fixtures. */
  addedContracts: RenewalSeed[];
  addContracts: (seeds: RenewalSeed[]) => void;
  /** Wipes recorded decisions, nudges and added contracts, keeping settings and flags. */
  resetDemo: () => void;
};

const RenewalRuntimeContext = createContext<RenewalRuntimeContextValue | null>(null);

function withHistory(previous: RenewalResolution | undefined, entry: Omit<DecisionEvent, "at">): DecisionEvent[] {
  return [...(previous?.history ?? []), { ...entry, at: stamp() }];
}

/**
 * Browser-local state shared between the Renewal Risk dashboard, the
 * per-vendor detail pages and Settings. It survives reloads on this device;
 * a backend is still required for shared ownership and external delivery.
 */
export function RenewalRuntimeProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, RenewalResolution>>({});
  const [departedOwners, setDepartedOwners] = useState<string[]>([]);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [integrations, setIntegrations] = useState(defaultIntegrations);
  const [settings, setSettings] = useState<OrgSettings>(defaultOrgSettings);
  const [flags, setFlags] = useState<Flags>(defaultFlags);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [addedContracts, setAddedContracts] = useState<RenewalSeed[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        // v2 wins; otherwise migrate v1 (same shape minus the new optional fields).
        const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const snapshot = parseSnapshot(saved);
          if (snapshot.resolutions) setResolutions(snapshot.resolutions);
          if (snapshot.departedOwners) setDepartedOwners(snapshot.departedOwners);
          if (snapshot.autoHandoff !== undefined) setAutoHandoff(snapshot.autoHandoff);
          if (snapshot.integrations) setIntegrations(snapshot.integrations);
          if (snapshot.settings) setSettings(snapshot.settings);
          if (snapshot.flags) setFlags(snapshot.flags);
          if (snapshot.outbox) setOutbox(snapshot.outbox);
          if (snapshot.events) setEvents(snapshot.events);
          if (snapshot.addedContracts) setAddedContracts(snapshot.addedContracts);
        }
      } catch {
        // A corrupt or unavailable browser store must not prevent use of the prototype.
      } finally {
        setRestored(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ resolutions, departedOwners, autoHandoff, integrations, settings, flags, outbox, events, addedContracts }),
      );
    } catch {
      // The session remains usable when storage is blocked or full.
    }
  }, [restored, resolutions, departedOwners, autoHandoff, integrations, settings, flags, outbox, events, addedContracts]);

  const today = useMemo(() => calendarDateIn(now(), settings.orgTimeZone), [settings.orgTimeZone]);

  const patchResolution = useCallback((slug: string, patch: (previous: RenewalResolution | undefined) => RenewalResolution) => {
    setResolutions((prev) => ({ ...prev, [slug]: patch(prev[slug]) }));
  }, []);

  const logEvent = useCallback((event: Omit<AnalyticsEvent, "at">) => {
    setEvents((prev) => [...prev, { ...event, at: stamp() }].slice(-MAX_EVENTS));
  }, []);

  const assignOwner = useCallback((slug: string, name: string) => {
    patchResolution(slug, (previous) => ({
      ...previous,
      ownerAssigned: name,
      history: withHistory(previous, { label: "Owner assigned", ownerName: name }),
    }));
  }, [patchResolution]);

  const assignDecider = useCallback((slug: string, name: string) => {
    patchResolution(slug, (previous) => ({
      ...previous,
      deciderAssigned: name,
      history: withHistory(previous, { label: "Decider assigned", ownerName: name }),
    }));
  }, [patchResolution]);

  const confirmDecision = useCallback((slug: string, decision: DecisionRecord) => {
    setResolutions((prev) => {
      const previous = prev[slug];
      const at = stamp();
      const label: DecisionEvent["label"] = decision.draft
        ? "Draft saved"
        : decision.confirmedAt && !previous?.decision?.confirmedAt
          ? "Outcome confirmed"
          : previous?.decision && !previous.decision.draft
            ? "Decision corrected"
            : "Decision recorded";
      return {
        ...prev,
        [slug]: {
          ...previous,
          decision: {
            ...decision,
            recordedAt: decision.draft
              ? decision.recordedAt
              : decision.recordedAt ?? previous?.decision?.recordedAt ?? at,
          },
          history: [...(previous?.history ?? []), { at, label, action: decision.action, ownerName: decision.ownerName }],
        },
      };
    });
    if (!decision.draft) {
      logEvent({
        type: decision.confirmedAt ? "outcome_confirmed" : "decision_recorded",
        contractId: slug,
        detail: decision.action,
      });
    }
  }, [logEvent]);

  const setTerms = useCallback((slug: string, terms: Omit<TermsOverride, "confirmedAt">) => {
    patchResolution(slug, (previous) => ({
      ...previous,
      terms: { ...previous?.terms, ...terms, confirmedAt: stamp() },
      history: withHistory(previous, {
        label: "Notice terms confirmed",
        detail: terms.noticePeriodDays !== undefined ? `${terms.noticePeriodDays}-day notice (${terms.source})` : undefined,
      }),
    }));
    logEvent({ type: "terms_captured", contractId: slug, detail: terms.source });
  }, [patchResolution, logEvent]);

  const setLeadTimeOverride = useCallback((slug: string, days: number | null) => {
    patchResolution(slug, (previous) => ({
      ...previous,
      leadTimeOverrideDays: days === null ? undefined : days,
      history: withHistory(previous, {
        label: "Lead time changed",
        detail: days === null ? "Back to the org default" : `${days} days`,
      }),
    }));
  }, [patchResolution]);

  const acknowledge = useCallback((slug: string, step: string) => {
    patchResolution(slug, (previous) => {
      if (previous?.acks?.[step]) return previous;
      return {
        ...previous,
        acks: { ...previous?.acks, [step]: stamp() },
        history: withHistory(previous, { label: "Reminder acknowledged", detail: step }),
      };
    });
    setOutbox((prev) => prev.map((entry) => (entry.contractId === slug && entry.step === step && !entry.ackedAt ? { ...entry, ackedAt: stamp() } : entry)));
    logEvent({ type: "nudge_acknowledged", contractId: slug, detail: step });
  }, [patchResolution, logEvent]);

  const snooze = useCallback((slug: string, until: ISODate) => {
    const count = resolutions[slug]?.snooze?.count ?? 0;
    if (count >= settings.snoozeLimit) return false;
    patchResolution(slug, (previous) => ({
      ...previous,
      snooze: { until, count: (previous?.snooze?.count ?? 0) + 1 },
      history: withHistory(previous, { label: "Reminders snoozed", detail: `until ${until}` }),
    }));
    logEvent({ type: "reminders_snoozed", contractId: slug, detail: until });
    return true;
  }, [resolutions, settings.snoozeLimit, patchResolution, logEvent]);

  const recordOutcome = useCallback((slug: string, cycle: ISODate, outcome: RenewalOutcome) => {
    patchResolution(slug, (previous) => ({
      ...previous,
      outcomes: { ...previous?.outcomes, [cycle]: outcome },
      history: withHistory(previous, { label: "Renewal outcome recorded", detail: `${cycle}: ${outcome}` }),
    }));
  }, [patchResolution]);

  const setInactive = useCallback((slug: string, inactive: boolean) => {
    patchResolution(slug, (previous) => ({ ...previous, inactive }));
  }, [patchResolution]);

  const toggleTask = useCallback((slug: string, taskId: string) => {
    patchResolution(slug, (previous) => {
      const decision = previous?.decision;
      if (!decision?.tasks) return previous ?? {};
      return { ...previous, decision: { ...decision, tasks: decision.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)) } };
    });
  }, [patchResolution]);

  const markDeparted = useCallback((name: string) => {
    setDepartedOwners((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const reinstateOwner = useCallback((name: string) => {
    setDepartedOwners((prev) => prev.filter((entry) => entry !== name));
  }, []);

  const updateIntegration = useCallback((id: IntegrationId, patch: Partial<IntegrationSettings>) => {
    setIntegrations((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<OrgSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setFlag = useCallback((name: FlagName, value: boolean) => {
    setFlags((prev) => ({ ...prev, [name]: value }));
  }, []);

  const appendOutbox = useCallback((entries: OutboxEntry[]) => {
    if (entries.length === 0) return;
    setOutbox((prev) => [...prev, ...entries].slice(-MAX_OUTBOX));
    setEvents((prev) => [
      ...prev,
      ...entries.map((entry): AnalyticsEvent => ({
        at: entry.sentAt,
        type: entry.step === "digest" ? "digest_sent" : "nudge_sent",
        contractId: entry.contractId,
        detail: entry.step === "digest" ? entry.recipient : `${entry.step}:${entry.role}`,
      })),
    ].slice(-MAX_EVENTS));
  }, []);

  const markTokenUsed = useCallback((token: string) => {
    setOutbox((prev) => prev.map((entry) => (entry.token === token && !entry.usedAt ? { ...entry, usedAt: stamp() } : entry)));
  }, []);

  const addContracts = useCallback((seeds: RenewalSeed[]) => {
    setAddedContracts((prev) => [...prev, ...seeds]);
  }, []);

  const resetDemo = useCallback(() => {
    setResolutions({});
    setOutbox([]);
    setEvents([]);
    setAddedContracts([]);
    setDepartedOwners([]);
  }, []);

  const value = useMemo(
    () => ({
      ready: restored,
      resolutions,
      assignOwner,
      assignDecider,
      confirmDecision,
      setTerms,
      setLeadTimeOverride,
      acknowledge,
      snooze,
      recordOutcome,
      setInactive,
      toggleTask,
      departedOwners,
      markDeparted,
      reinstateOwner,
      autoHandoff,
      setAutoHandoff,
      integrations,
      updateIntegration,
      settings,
      updateSettings,
      flags,
      setFlag,
      today,
      outbox,
      appendOutbox,
      markTokenUsed,
      events,
      logEvent,
      addedContracts,
      addContracts,
      resetDemo,
    }),
    [
      restored, resolutions, assignOwner, assignDecider, confirmDecision, setTerms, setLeadTimeOverride, acknowledge, snooze,
      recordOutcome, setInactive, toggleTask, departedOwners, markDeparted, reinstateOwner, autoHandoff, integrations,
      updateIntegration, settings, updateSettings, flags, setFlag, today, outbox, appendOutbox, markTokenUsed,
      events, logEvent, addedContracts, addContracts, resetDemo,
    ],
  );

  return <RenewalRuntimeContext.Provider value={value}>{children}</RenewalRuntimeContext.Provider>;
}

export function useRenewalRuntime() {
  const context = useContext(RenewalRuntimeContext);
  if (!context) {
    throw new Error("useRenewalRuntime must be used within a RenewalRuntimeProvider");
  }
  return context;
}

/** Settings, flags and "today" — everything the decision engine reads besides the contract itself. */
export function useRenewalConfig() {
  const { settings, flags, today } = useRenewalRuntime();
  return { settings, flags, today, decisionsEnabled: flags.renewalDecisions };
}
