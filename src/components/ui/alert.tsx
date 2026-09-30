import { Text, clx } from "@medusajs/ui";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type AlertTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<AlertTone, { bar: string; bg: string; border: string }> = {
  neutral: {
    bar: "bg-ui-alert-neutral-icon",
    bg: "bg-ui-alert-neutral-bg",
    border: "border-ui-alert-neutral-border",
  },
  info: {
    bar: "bg-ui-alert-info-icon",
    bg: "bg-ui-alert-info-bg",
    border: "border-ui-alert-info-border",
  },
  success: {
    bar: "bg-ui-alert-success-icon",
    bg: "bg-ui-alert-success-bg",
    border: "border-ui-alert-success-border",
  },
  warning: {
    bar: "bg-ui-alert-warning-icon",
    bg: "bg-ui-alert-warning-bg",
    border: "border-ui-alert-warning-border",
  },
  danger: {
    bar: "bg-ui-alert-danger-icon",
    bg: "bg-ui-alert-danger-bg",
    border: "border-ui-alert-danger-border",
  },
};

export type AlertAction = {
  label: string;
  onClick: () => void;
};

type AlertProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  tone: AlertTone;
  /** Compact 12px title, matching the Figma Alert's default typography. Omit and use `children` for custom content. */
  title?: string;
  description?: string;
  actions?: AlertAction[];
  children?: ReactNode;
  className?: string;
};

/** Status alert from Figma node 49:8161. */
export function Alert({
  tone,
  title,
  description,
  actions,
  children,
  className,
  ...props
}: AlertProps) {
  const styles = toneStyles[tone];
  const hasStructuredContent = title || description;
  const structuredContent = hasStructuredContent ? (
    <div className="flex w-full flex-col gap-1">
      {title ? (
        <Text as="span" className="text-[14px] font-medium leading-5 tracking-[-0.105px] text-ui-fg-base">
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text as="span" className="text-[14px] leading-5 tracking-[-0.07px] text-ui-fg-base">
          {description}
        </Text>
      ) : null}
    </div>
  ) : null;
  const actionContent = actions && actions.length > 0 ? (
    <>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="text-[14px] font-medium leading-5 tracking-[-0.105px] text-ui-fg-base hover:underline"
        >
          {action.label}
        </button>
      ))}
    </>
  ) : null;

  return (
    <div className={clx("flex w-full items-stretch gap-1", className)} {...props}>
      <div className={clx("w-1 shrink-0 rounded-full", styles.bar)} />
      <div
        className={clx(
          "flex flex-1 flex-col gap-3 rounded-tl-[4px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[4px] border-[0.5px] px-4",
          hasStructuredContent ? "py-3" : "py-2.5",
          styles.bg,
          styles.border,
        )}
      >
        {structuredContent}
        {children}
        {actionContent ? (
          <div className="flex w-full items-start gap-3">
            {actionContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
