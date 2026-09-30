import { Switch, Text } from "@medusajs/ui";
import type { ReactNode } from "react";

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex flex-col px-3 py-2">
        <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
          {title}
        </Text>
        {description ? (
          <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">
            {description}
          </Text>
        ) : null}
      </div>
      <div className="border-t border-ui-border-base bg-ui-bg-base">{children}</div>
    </section>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  leading,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="flex min-w-0 flex-col">
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            {title}
          </Text>
          <Text as="span" className="text-[14px] leading-5 text-ui-fg-subtle">
            {description}
          </Text>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
