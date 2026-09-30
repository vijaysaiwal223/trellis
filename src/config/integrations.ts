export type IntegrationId = "slack" | "teams";

export type IntegrationSettings = {
  connected: boolean;
  /** Where escalations are posted. */
  channel: string;
  /** Message the accountable owner directly (they rarely open Trellis). */
  dmOwners: boolean;
  /** Post escalations (T-7, T-2, missed window) to the shared channel. */
  postEscalations: boolean;
};

export type IntegrationApp = {
  id: IntegrationId;
  name: string;
  logo: string;
  blurb: string;
  channels: string[];
};

const logo = (name: string) => `/assets/integrations/${name}.svg`;

export const integrationApps: IntegrationApp[] = [
  {
    id: "slack",
    name: "Slack",
    logo: logo("slack"),
    blurb: "Direct messages to owners and escalations in a shared channel.",
    channels: ["#renewal-alerts", "#finance-ops", "#it-procurement"],
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    logo: logo("microsoftteams"),
    blurb: "Chat messages to owners and escalations in a team channel.",
    channels: ["Finance › Renewals", "Procurement › Alerts"],
  },
];

export const defaultIntegrations = (): Record<IntegrationId, IntegrationSettings> =>
  Object.fromEntries(
    integrationApps.map((app) => [
      app.id,
      {
        connected: false,
        channel: "",
        dmOwners: false,
        postEscalations: false,
      },
    ]),
  ) as Record<IntegrationId, IntegrationSettings>;
