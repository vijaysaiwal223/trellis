"use client";

import { Text, clx } from "@medusajs/ui";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { noticeLetter } from "@/features/renewal-risk/follow-up";
import type { DecisionRecord } from "@/features/renewal-risk/decision-model";
import type { Renewal } from "@/features/renewal-risk/types";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { actionLabel } from "../types";

/** Follow-through created by a decision: dated tasks, plus a ready-to-edit notice letter when the answer is Cancel. */
export function FollowUpCard({ row, slug, decision }: { row: Renewal; slug: string; decision: DecisionRecord }) {
  const { toggleTask, today } = useRenewalRuntime();
  const [showLetter, setShowLetter] = useState(false);
  const [copied, setCopied] = useState(false);
  const tasks = decision.tasks ?? [];
  if (tasks.length === 0 && decision.action !== "Cancel") return null;
  const letter = noticeLetter(row, decision.decidedBy ?? decision.ownerName ?? row.decider);

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-subtle">
      <div className="flex items-center justify-between px-3 py-2">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">Follow-through · {actionLabel(decision.action)}</Text>
        <Text as="span" className="text-[12px] text-ui-fg-muted">{tasks.filter((task) => task.done).length} of {tasks.length} done</Text>
      </div>
      <div className="flex flex-col gap-2 border-t border-ui-border-base bg-ui-bg-base p-3">
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <label className="flex cursor-pointer items-start gap-2 text-[13px]">
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(slug, task.id)} className="mt-1" />
                <span className="min-w-0">
                  <span className={clx("text-ui-fg-base", task.done && "text-ui-fg-muted line-through")}>{task.label}</span>
                  {task.dueBy ? (
                    <span className={clx("ml-2 text-[12px]", !task.done && task.dueBy < today ? "font-medium text-ui-fg-error" : "text-ui-fg-subtle")}>
                      by {task.dueBy}{!task.done && task.dueBy < today ? " · overdue" : ""}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {decision.action === "Cancel" ? (
          <div className="flex flex-col gap-2 border-t border-ui-border-base pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="small" onClick={() => setShowLetter((open) => !open)}>{showLetter ? "Hide notice letter" : "Draft notice letter"}</Button>
              {showLetter ? (
                <Button
                  variant="transparent"
                  size="small"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
            {showLetter ? (
              <>
                <textarea readOnly value={letter} rows={11} className="w-full resize-none rounded-[6px] border border-ui-border-base bg-ui-bg-subtle px-2 py-1.5 font-mono text-[12px] leading-5 outline-none" />
                <Text as="p" className="text-[12px] leading-4 text-ui-fg-muted">A starting point, not legal advice. Fill the bracketed parts and check the contract&apos;s notice clause for how it must be delivered. Trellis does not send it.</Text>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
