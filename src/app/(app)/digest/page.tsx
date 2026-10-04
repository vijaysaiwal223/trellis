import { DigestView } from "@/features/renewal-risk/components/digest-view";

export default function DigestPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-ui-border-base bg-ui-bg-base p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-[20px] font-bold leading-7 tracking-[-0.05px] text-ui-fg-base">Monday digest</h1>
        <span className="text-[12px] text-ui-fg-muted">Preview only · nothing is sent</span>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <DigestView />
      </div>
    </div>
  );
}
