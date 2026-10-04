"use client";

import { Select, Switch, Text } from "@medusajs/ui";

import { AssetIcon } from "@/components/ui/asset-icon";
import { Button } from "@/components/ui/button";
import { integrationApps, type IntegrationApp } from "@/config/integrations";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

export function IntegrationsTab({ notify }: { notify: (message: string) => void }) {
  const { integrations, updateIntegration } = useRenewalRuntime();

  return (
    <div className="flex w-full items-start gap-3 py-4">
      {integrationApps.map((app) => (
        <IntegrationCard
          key={app.id}
          app={app}
          settings={integrations[app.id]}
          onToggleConnected={() => {
            const next = !integrations[app.id].connected;
            updateIntegration(app.id, { connected: next });
            notify(`${app.name} ${next ? "connected" : "disconnected"}.`);
          }}
          onChange={(patch) => updateIntegration(app.id, patch)}
        />
      ))}
    </div>
  );
}

function IntegrationCard({
  app,
  settings,
  onToggleConnected,
  onChange,
}: {
  app: IntegrationApp;
  settings: { connected: boolean; dmOwners: boolean; postEscalations: boolean; channel: string };
  onToggleConnected: () => void;
  onChange: (patch: Partial<{ dmOwners: boolean; postEscalations: boolean; channel: string }>) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex w-full items-center p-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base p-px ">
              <span className="flex size-full items-center justify-center rounded-[5px] bg-ui-bg-component-hover">
                <AssetIcon src={app.logo} alt="" size={20} />
              </span>
            </span>
            <div className="flex min-w-0 flex-1 flex-col text-[14px] leading-5">
              <Text as="span" className="font-medium text-ui-fg-base tracking-[-0.105px]">
                {app.name}
              </Text>
              <Text as="span" className="truncate text-ui-fg-subtle tracking-[-0.07px]">
                {app.blurb}
              </Text>
            </div>
          </div>
          <Button variant={settings.connected ? "danger" : "primary"} size="small" onClick={onToggleConnected}>
            {settings.connected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>

      {settings.connected ? (
        <div className="flex w-full flex-col border-t border-ui-border-base bg-ui-bg-subtle">
          <div className="flex w-full items-center justify-center border-t border-ui-border-base bg-ui-bg-base px-3 py-2">
            <div className="flex flex-1 items-center gap-4">
              <div className="flex flex-1 flex-col gap-1 text-[14px] leading-5">
                <Text as="span" className="font-medium text-ui-fg-base tracking-[-0.105px]">
                  Message owners directly
                </Text>
                <Text as="span" className="text-ui-fg-subtle tracking-[-0.07px]">
                  Owners get the T-30 and T-14 nudge with Renew / Reduce seats / Renegotiate / Cancel — no login needed.
                </Text>
              </div>
              <Switch
                checked={settings.dmOwners}
                onCheckedChange={(value) => onChange({ dmOwners: value })}
                aria-label="Message owners directly"
              />
            </div>
          </div>

          <div className="flex w-full items-center justify-between border-t border-ui-border-base bg-ui-bg-base px-3 py-2.5">
            <div className="flex flex-1 flex-col gap-1 text-[14px] leading-5">
              <Text as="span" className="font-medium text-ui-fg-base tracking-[-0.105px]">
                Post escalations to a channel
              </Text>
              <Text as="span" className="truncate text-ui-fg-subtle tracking-[-0.07px]">
                T-7, T-2 and missed-window alerts, so finance sees what&apos;s slipping.
              </Text>
            </div>
            <Switch
              checked={settings.postEscalations}
              onCheckedChange={(value) => onChange({ postEscalations: value })}
              aria-label="Post escalations to a channel"
            />
          </div>

          <div className="flex w-full items-center justify-between border-t border-ui-border-base bg-ui-bg-base px-3 py-2.5">
            <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base tracking-[-0.105px]">
              Channel
            </Text>
            <Select value={settings.channel || undefined} onValueChange={(channel) => onChange({ channel })} size="small">
              <Select.Trigger aria-label={`${app.name} channel`} className="w-[280px] !shadow-borders-base">
                <Select.Value placeholder="Select" />
              </Select.Trigger>
              <Select.Content>
                {app.channels.map((channel) => (
                  <Select.Item key={channel} value={channel}>
                    {channel}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
