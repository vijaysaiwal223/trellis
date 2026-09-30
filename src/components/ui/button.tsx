import { clx } from "@medusajs/ui";
import { cloneElement, forwardRef, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "transparent" | "transparent-muted" | "transparent-subtle";
export type ButtonSize = "small" | "base" | "xlarge";

const variantClasses: Record<ButtonVariant, string> = {
  primary: clx(
    "bg-ui-button-inverted !text-white shadow-buttons-inverted",
    "hover:bg-ui-button-inverted-hover active:bg-ui-button-inverted-pressed",
    "focus-visible:shadow-buttons-inverted-focus",
  ),
  secondary: clx(
    "bg-ui-button-neutral text-ui-fg-base shadow-buttons-neutral",
    "hover:bg-ui-button-neutral-hover active:bg-ui-button-neutral-pressed",
    "focus-visible:shadow-buttons-neutral-focus",
  ),
  danger: clx(
    "bg-ui-button-danger !text-white shadow-buttons-danger",
    "hover:bg-ui-button-danger-hover active:bg-ui-button-danger-pressed",
    "focus-visible:shadow-buttons-danger-focus",
  ),
  transparent: clx(
    "bg-ui-button-transparent text-ui-fg-base",
    "hover:bg-ui-button-transparent-hover active:bg-ui-button-transparent-pressed",
    "focus-visible:bg-ui-bg-base focus-visible:shadow-buttons-neutral-focus",
  ),
  "transparent-muted": clx(
    "bg-ui-button-transparent text-ui-fg-muted",
    "hover:bg-ui-button-transparent-hover active:bg-ui-button-transparent-pressed",
    "focus-visible:bg-ui-bg-base focus-visible:shadow-buttons-neutral-focus",
  ),
  "transparent-subtle": clx(
    "bg-ui-button-transparent text-ui-fg-subtle",
    "hover:bg-ui-button-transparent-hover active:bg-ui-button-transparent-pressed",
    "focus-visible:bg-ui-bg-base focus-visible:shadow-buttons-neutral-focus",
  ),
};

const disabledClasses: Record<ButtonVariant, string> = {
  primary: "disabled:bg-ui-bg-disabled disabled:text-ui-fg-disabled disabled:shadow-buttons-neutral",
  secondary: "disabled:bg-ui-bg-disabled disabled:text-ui-fg-disabled disabled:shadow-buttons-neutral",
  danger: "disabled:bg-ui-bg-disabled disabled:text-ui-fg-disabled disabled:shadow-buttons-neutral",
  transparent: "disabled:!bg-transparent disabled:!shadow-none disabled:text-ui-fg-disabled",
  "transparent-muted": "disabled:!bg-transparent disabled:!shadow-none disabled:text-ui-fg-disabled",
  "transparent-subtle": "disabled:!bg-transparent disabled:!shadow-none disabled:text-ui-fg-disabled",
};

const sizeClasses: Record<ButtonSize, string> = {
  small: "h-7 gap-1.5 px-2 text-[14px] leading-5",
  base: "h-8 gap-1.5 px-3 text-[14px] leading-5",
  xlarge: "h-10 gap-1.5 px-4 text-[14px] leading-5",
};

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element in place of a `button`, merging in the button's classes (e.g. for a `Link`). */
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
};

export type ButtonProps = ButtonOwnProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "base", asChild = false, leftIcon, rightIcon, children, className, disabled, type, ...props }, ref) => {
    const classes = clx(
      "relative inline-flex w-fit shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium tracking-[-0.105px] outline-none transition-colors",
      "disabled:cursor-not-allowed",
      variantClasses[variant],
      disabledClasses[variant],
      sizeClasses[size],
      className,
    );

    const content = (
      <>
        {leftIcon}
        {children}
        {rightIcon}
      </>
    );

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
      return cloneElement(child, {
        className: clx(classes, child.props.className),
        children: (
          <>
            {leftIcon}
            {child.props.children}
            {rightIcon}
          </>
        ),
      });
    }

    return (
      <button ref={ref} type={type ?? "button"} disabled={disabled} className={classes} {...props}>
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";
