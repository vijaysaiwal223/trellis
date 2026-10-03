"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Alert } from "@/components/ui/alert";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";
import { renewalTask } from "../workflow";

export function DecisionBanner({ renewals }: { renewals: RenewalSeed[] }) {
  const assessed = useAssessedRenewals(renewals);
  const { resolutions } = useRenewalRuntime();

  const pending = useMemo(
    () =>
      assessed
        .map((entry) => ({ row: entry.row, task: renewalTask(entry.row, resolutions[entry.slug]) }))
        .filter((entry) => entry.task.kind !== "done")
        .sort((a, b) => b.task.priority - a.task.priority),
    [assessed, resolutions],
  );

  if (pending.length === 0) {
    return (
      <Alert
        tone="success"
        role="status"
        title="All renewal outcomes confirmed."
        description="No open renewal tasks remain in this portfolio."
        className="mt-4"
      />
    );
  }

  const top = pending[0];
  const summary = `${top.row.vendor}: ${top.task.title} · ${top.task.due} · ${top.row.contractAmount}`;

  return (
    <Alert
      tone="danger"
      role="alert"
      title={`${pending.length} renewal${pending.length === 1 ? "" : "s"} have an open next step.`}
      description={`Most urgent — ${summary}`}
      className="mt-4"
    >
      <div className="flex w-full items-start gap-3">
        <Link
          href={top.task.href}
          className="text-[14px] font-medium leading-5 tracking-[-0.105px] text-ui-fg-base hover:underline"
        >
          Take action
        </Link>
      </div>
    </Alert>
  );
}
