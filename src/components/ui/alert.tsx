import type { ReactNode } from "react";

export type AlertStatus = "Neutral" | "Information" | "Success" | "Warning" | "Error";

/** Each status: the accent bar, the box fill and its border, from the Trellis tag tokens. */
const statusStyle: Record<AlertStatus, { bar: string; box: string }> = {
  Neutral: { bar: "bg-[#71717a]", box: "bg-[#f4f4f5] border-[#d4d4d8]" },
  Information: { bar: "bg-[#3b82f6]", box: "bg-[#dbeafe] border-[#93c5fd]" },
  Success: { bar: "bg-[#10b981]", box: "bg-[#d1fae5] border-[#6ee7b7]" },
  Warning: { bar: "bg-[#f97316]", box: "bg-[#ffedd5] border-[#fdba74]" },
  Error: { bar: "bg-[#f43f5e]", box: "bg-[#ffe4e6] border-[#fda4af]" },
};

type AlertProps = {
  status?: AlertStatus;
  /** Bold first line. */
  title?: ReactNode;
  /** The message under the title. */
  children?: ReactNode;
  /** Link-style actions shown under the message, e.g. "View record". */
  actions?: ReactNode;
  className?: string;
};

/** Inline status message: an accent bar beside a tinted box with a title, a message and optional actions. */
export function Alert({ status = "Neutral", title, children, actions, className }: AlertProps) {
  const style = statusStyle[status];
  return (
    <div role={status === "Error" || status === "Warning" ? "alert" : "status"} className={`flex w-full items-stretch gap-[4px] ${className ?? ""}`}>
      <span aria-hidden className={`w-[4px] shrink-0 rounded-full ${style.bar}`} />
      <div
        className={`flex min-w-px flex-1 flex-col gap-[12px] rounded-bl-[4px] rounded-br-[8px] rounded-tl-[4px] rounded-tr-[8px] border-[0.5px] border-solid px-[16px] py-[12px] text-[#18181b] ${style.box}`}
      >
        <div className="flex flex-col gap-[4px] text-[14px] leading-[20px]">
          {title ? <span className="font-medium tracking-[-0.06px]">{title}</span> : null}
          {children ? <div className="flex flex-col gap-[4px] tracking-[-0.03px]">{children}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-[12px] text-[14px]">{actions}</div> : null}
      </div>
    </div>
  );
}
