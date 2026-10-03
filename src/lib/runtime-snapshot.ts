import type { IntegrationId, IntegrationSettings } from "@/config/integrations";
import {
  defaultOrgSettings,
  type AnalyticsEvent,
  type OrgSettings,
  type OutboxEntry,
  type RenewalResolution,
} from "@/features/renewal-risk/decision-model";
import type { RenewalSeed } from "@/features/renewal-risk/types";

import { defaultFlags, type Flags } from "./flags";

/** Everything the runtime state persists. Every field is optional on read. */
export type RuntimeSnapshot = {
  resolutions?: Record<string, RenewalResolution>;
  departedOwners?: string[];
  autoHandoff?: boolean;
  integrations?: Record<IntegrationId, IntegrationSettings>;
  settings?: OrgSettings;
  flags?: Flags;
  outbox?: OutboxEntry[];
  events?: AnalyticsEvent[];
  addedContracts?: RenewalSeed[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Reads a saved snapshot of either version. v1 (the original shape: resolutions,
 * departed owners, hand-off policy, integrations) is a strict subset of v2, so
 * migrating is just "read what is there, default the rest". Nothing is rewritten
 * in the v1 store, so rolling the code back finds its data untouched.
 */
export function parseSnapshot(raw: string): RuntimeSnapshot {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data)) return {};
  const snapshot: RuntimeSnapshot = {};
  if (isRecord(data.resolutions)) snapshot.resolutions = data.resolutions as Record<string, RenewalResolution>;
  if (Array.isArray(data.departedOwners)) snapshot.departedOwners = data.departedOwners.filter((name): name is string => typeof name === "string");
  if (typeof data.autoHandoff === "boolean") snapshot.autoHandoff = data.autoHandoff;
  if (isRecord(data.integrations)) snapshot.integrations = data.integrations as Record<IntegrationId, IntegrationSettings>;
  if (isRecord(data.settings)) snapshot.settings = { ...defaultOrgSettings, ...(data.settings as Partial<OrgSettings>) };
  if (isRecord(data.flags)) snapshot.flags = { ...defaultFlags, ...(data.flags as Partial<Flags>) };
  if (Array.isArray(data.outbox)) snapshot.outbox = data.outbox as OutboxEntry[];
  if (Array.isArray(data.events)) snapshot.events = data.events as AnalyticsEvent[];
  if (Array.isArray(data.addedContracts)) snapshot.addedContracts = data.addedContracts as RenewalSeed[];
  return snapshot;
}
