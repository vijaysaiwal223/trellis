"use client";

import { Text } from "@medusajs/ui";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { SIGNED_IN_NAME } from "@/config/people";
import { now } from "@/lib/clock";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { buildDigest, type DigestEntry } from "../digest";
import { renewals } from "../mock-data";
import { stageLabel } from "../stage";
import { useAssessedRenewals } from "../use-assessed-renewals";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The Monday digest, rendered from the same data as the queue. */
export function DigestView() {
  const { resolutions } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const digest = useMemo(
    () => buildDigest(assessed.map(({ row, slug }) => ({ row, resolution: resolutions[slug] }))),
    [assessed, resolutions],
  );
  const dateLine = new Date(now()).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
  const { dueThisWeek, pastDeadline, next30, withoutOwner, totals } = digest;

  return (
    <div className="flex w-full flex-col items-center gap-4 pb-10">
      <div className="w-full max-w-[680px] rounded-[10px] border border-ui-border-base bg-ui-bg-base px-5 py-4 text-[13px]">
        <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1">
          <dt className="text-ui-fg-subtle">From</dt><dd>Trellis &lt;decisions@trellis.app&gt;</dd>
          <dt className="text-ui-fg-subtle">To</dt><dd>{SIGNED_IN_NAME}, Admin</dd>
          <dt className="text-ui-fg-subtle">Date</dt><dd>{dateLine}</dd>
          <dt className="text-ui-fg-subtle">Subject</dt>
          <dd className="font-semibold">
            {plural(dueThisWeek.length, "renewal decision")} due this week
            {pastDeadline.length ? `, ${pastDeadline.length} past deadline` : ""}
          </dd>
        </dl>
      </div>

      <article className="flex w-full max-w-[680px] flex-col gap-5 rounded-[10px] border border-ui-border-base bg-ui-bg-base px-6 py-7">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ui-fg-base">Trellis · Monday renewal digest</div>
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-[20px] font-semibold text-ui-fg-base">Good morning, {SIGNED_IN_NAME.split(" ")[0]}.</h2>
          <Text as="p" className="text-[14px] leading-6 text-ui-fg-base">
            {dueThisWeek.length > 0
              ? <>{plural(dueThisWeek.length, "contract")} reach their last day to cancel or change this week, worth <b className="font-semibold">{usd.format(totals.dueThisWeekValue)}</b>.</>
              : "Nothing reaches its last day to cancel this week."}
            {withoutOwner.length > 0 ? ` ${plural(withoutOwner.length, "open renewal")} still ${withoutOwner.length === 1 ? "has" : "have"} no owner.` : ""}
          </Text>
        </div>

        <Section title={`Due this week · ${usd.format(totals.dueThisWeekValue)}`} tone="warning" empty="Nothing due this week.">
          {dueThisWeek.map((entry) => <DigestRow key={entry.row.id} entry={entry} />)}
        </Section>

        {pastDeadline.length > 0 ? (
          <Section title={`Past deadline · ${usd.format(totals.pastDeadlineValue)}`} tone="danger">
            {pastDeadline.map((entry) => <DigestRow key={entry.row.id} entry={entry} />)}
            <Text as="p" className="text-[12px] leading-4 text-ui-fg-subtle">
              These renew on their current terms. The notice window has closed, so any change needs the vendor&apos;s agreement.
            </Text>
          </Section>
        ) : null}

        <div className="flex flex-col gap-2">
          <Text as="span" className="text-[12px] font-semibold text-ui-fg-subtle">Next 30 days · {plural(next30.length, "open decision")} · {usd.format(totals.next30Value)}</Text>
          {next30.length === 0 ? (
            <Text as="p" className="text-[13px] text-ui-fg-subtle">Nothing else is due in the next 30 days.</Text>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {next30.map((entry) => (
                  <tr key={entry.row.id} className="border-t border-ui-border-base">
                    <td className="py-2 pr-3 font-medium text-ui-fg-base">{entry.row.vendor}</td>
                    <td className="py-2 pr-3 tabular-nums text-ui-fg-subtle">{entry.row.cancelBy}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{entry.row.contractAmount}</td>
                    <td className="py-2 text-right text-ui-fg-subtle">{stageLabel[entry.stage]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="inline-flex min-h-[40px] items-center rounded-md bg-ui-bg-interactive px-4 text-[14px] font-medium text-white hover:bg-ui-bg-interactive-hover">
            Open renewal decisions
          </Link>
          <Text as="span" className="text-[12px] text-ui-fg-subtle">Only renewals you manage are included. Tool owners get asked about their own contracts.</Text>
        </div>
      </article>
    </div>
  );
}

function Section({
  title,
  tone,
  empty,
  children,
}: {
  title: string;
  tone: "warning" | "danger";
  empty?: string;
  children?: ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="flex flex-col gap-1">
      <Text as="span" className={tone === "danger" ? "text-[12px] font-semibold text-ui-fg-error" : "text-[12px] font-semibold text-ui-tag-orange-text"}>
        {title}
      </Text>
      {hasItems ? children : <Text as="p" className="text-[13px] text-ui-fg-subtle">{empty}</Text>}
    </div>
  );
}

function DigestRow({ entry }: { entry: DigestEntry }) {
  const { row } = entry;
  const owner = row.owner ?? "Unassigned";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-base py-3">
      <div className="flex min-w-0 flex-col">
        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
          {row.vendor} <span className="font-normal text-ui-fg-subtle">· {row.contractAmount}/yr · {row.contractType.toLowerCase()}</span>
        </Text>
        <Text as="span" className="text-[13px] text-ui-fg-subtle">
          Cancel-by {row.cancelBy} · {row.timing} · Owner: {owner} · {stageLabel[entry.stage]}
        </Text>
      </div>
      <Link href={entry.href} className="shrink-0 rounded-md border border-ui-border-base px-3 py-1.5 text-[13px] font-medium text-ui-fg-base hover:bg-ui-bg-subtle-hover">
        {entry.action}
      </Link>
    </div>
  );
}
