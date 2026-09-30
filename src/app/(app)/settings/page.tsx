import { Heading, Text } from "@medusajs/ui";

import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata = { title: "Trellis | Settings" };

export default function SettingsPage() {
  return (
    <div className="h-full rounded-[12px] border border-ui-border-base bg-ui-bg-base p-4">
      <Heading
        level="h1"
        className="font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base"
      >
        Settings
      </Heading>
      <Text as="p" className="mb-6 mt-1 text-[14px] leading-5 text-ui-fg-subtle">
        Who is accountable for each subscription, and how Trellis chases them before the deadline.
      </Text>
      <SettingsView />
    </div>
  );
}
