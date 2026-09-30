import { Text, clx } from "@medusajs/ui";

type StackedCellTextProps = {
  primary: string;
  secondary: string;
  secondaryClassName?: string;
};

/** Bold primary line over a subtle secondary line, as used across table cells. */
export function StackedCellText({
  primary,
  secondary,
  secondaryClassName = "text-ui-fg-subtle",
}: StackedCellTextProps) {
  return (
    <div className="min-w-0">
      <Text
        as="div"
        className="truncate text-[14px] font-bold leading-5 text-ui-fg-base"
      >
        {primary}
      </Text>
      <Text
        as="div"
        className={clx(
          "truncate text-[14px] font-normal leading-5",
          secondaryClassName,
        )}
      >
        {secondary}
      </Text>
    </div>
  );
}
