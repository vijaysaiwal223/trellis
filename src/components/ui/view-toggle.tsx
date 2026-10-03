import { clx } from "@medusajs/ui";
import { RiKanbanView, RiListCheck2, RiTimeLine } from "@remixicon/react";

const icons = { list: RiListCheck2, kanban: RiKanbanView, queue: RiTimeLine };

export type ViewToggleOption<T extends string> = { id: T; label: string; icon: keyof typeof icons };

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ViewToggleOption<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-start gap-px rounded-[8px] bg-ui-bg-subtle-hover p-0.5">
      {options.map((option) => {
        const Icon = icons[option.icon];
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={clx(
              "flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[6px] px-3 text-[14px] font-medium leading-5 tracking-[-0.07px] transition-colors",
              active
                ? "bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest"
                : "text-ui-fg-muted hover:text-ui-fg-base",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
