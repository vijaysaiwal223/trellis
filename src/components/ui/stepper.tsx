/** Where a renewal sits in the decision journey, shared by every drawer. */
export const renewalJourney = ["Assign owner", "Owner recommends", "Lead decides", "Send notice", "Outcome confirmed"] as const;

/** The renewal path for a deadline that has already passed. */
export const recoveryJourney = ["Deadline missed", "Choose recovery", "Outcome confirmed"] as const;

type StepperProps = {
  steps: readonly string[];
  /** Index of the step in progress. Equal to steps.length once every step is done. */
  current: number;
};

/** Progress through a sequence: the current step's name, a count, and a segment per step filled up to the current one. */
export function Stepper({ steps, current }: StepperProps) {
  const complete = current >= steps.length;
  const shown = complete ? steps.length : current + 1;
  const title = complete ? steps[steps.length - 1] : steps[current];
  return (
    <div className="flex shrink-0 flex-col gap-[12px] border-b border-solid border-[#e4e4e7] px-[16px] py-[12px]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium leading-[20px] tracking-[-0.14px] text-[#18181b]">{title}</span>
        <span className="flex h-[24px] items-center justify-center rounded-full border border-solid border-[#e4e4e7] bg-[#fafafa] px-[9px] text-[12px] font-medium leading-[16px] text-[#18181b]">
          {`${shown}/${steps.length}`}
        </span>
      </div>
      <div role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={shown} className="flex items-center gap-[6px]">
        {steps.map((step, index) => (
          <span
            key={step}
            title={step}
            className={`h-[8px] flex-1 rounded-[4px] ${index < shown ? "bg-[#3b82f6]" : "bg-[#f4f4f5]"}`}
          />
        ))}
      </div>
    </div>
  );
}
