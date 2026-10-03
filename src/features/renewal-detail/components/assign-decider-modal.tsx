"use client";

import { Text } from "@medusajs/ui";
import { RiCloseLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { people } from "@/config/people";

/** Names the person who makes the renew/renegotiate/downsize/cancel call — who may differ from whoever runs the tool. */
export function AssignDeciderModal({
  vendor,
  toolOwner,
  current,
  departedOwners,
  onAssign,
  onClose,
}: {
  vendor: string;
  toolOwner: string | null;
  current: string | null;
  departedOwners: string[];
  onAssign: (name: string) => void;
  onClose: () => void;
}) {
  const options = people.filter((person) => !departedOwners.includes(person.name));
  const [choice, setChoice] = useState(current ?? options[0]?.name ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="decider-title" tabIndex={-1} className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-flyout outline-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text as="p" id="decider-title" className="text-[16px] font-medium leading-6 text-ui-fg-base">Who decides on {vendor}?</Text>
          <Text as="p" className="text-[13px] leading-5 text-ui-fg-subtle">
            The decider gets the reminders and makes the call. {toolOwner ? `${toolOwner} runs the tool, but that does not have to be the same person.` : "This can be someone other than whoever runs the tool."}
          </Text>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover">
          <RiCloseLine className="size-4" />
        </button>
      </div>
      {options.length === 0 ? (
        <Text as="p" className="text-[13px] text-ui-fg-error">Everyone in the directory is marked as departed. Reinstate someone in Settings first.</Text>
      ) : (
        <label className="flex flex-col gap-1">
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">Decider</Text>
          <select value={choice} onChange={(event) => setChoice(event.target.value)} className="h-9 w-full rounded-[6px] border border-ui-border-base bg-ui-bg-base px-2 text-[14px] outline-none">
            {options.map((person) => <option key={person.name} value={person.name}>{person.name} — {person.team}</option>)}
          </select>
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="base" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="base" disabled={!choice} onClick={() => { onAssign(choice); onClose(); }}>Assign decider</Button>
      </div>
    </div>
  );
}
