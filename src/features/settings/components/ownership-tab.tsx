"use client";

import { Avatar, Input, StatusBadge, Table, Text, clx } from "@medusajs/ui";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { avatarUrl, people } from "@/config/people";
import { renewalDetails } from "@/features/renewal-detail";
import { renewals, useAssessedRenewals } from "@/features/renewal-risk";
import { useRenewalRuntime } from "@/lib/renewal-runtime-state";

import { SettingsCard, initialsOf } from "./settings-ui";

const statusDisplay = {
  active: { label: "Active owner", color: "green" },
  departed: { label: "Owner departed", color: "red" },
  unassigned: { label: "Unassigned", color: "orange" },
} as const;

type Filter = "all" | "needs";

export function OwnershipTab({ notify }: { notify: (message: string) => void }) {
  const { assignOwner, departedOwners } = useRenewalRuntime();
  const assessed = useAssessedRenewals(renewals);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const available = people.filter((person) => !departedOwners.includes(person.name));
  const needsOwner = assessed.filter(({ row }) => !row.owner).length;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return assessed.filter(({ row }) => {
      if (filter === "needs" && row.owner) return false;
      if (!term) return true;
      return [row.vendor, row.subtitle, row.owner ?? "", row.team ?? ""].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [assessed, filter, query]);

  const assign = (slug: string, vendor: string, name: string) => {
    assignOwner(slug, name);
    notify(`${name} is now in charge of ${vendor}.`);
  };

  return (
    <SettingsCard
      title="Who's in charge"
      description="The person accountable for each subscription. They get the first nudge before cancel-by."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base px-3 py-2">
        <div className="flex items-center gap-2">
          {(
            [
              { id: "all", label: `All (${assessed.length})` },
              { id: "needs", label: `Needs an owner (${needsOwner})` },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={clx(
                "h-7 rounded-full border px-3 text-[14px] font-medium transition-colors",
                filter === option.id
                  ? "border-ui-bg-interactive bg-ui-bg-interactive-soft text-ui-fg-interactive"
                  : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-subtle",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subscription or person"
          aria-label="Search subscription or person"
          className="!h-8 !w-[260px] !text-[14px]"
        />
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-3 py-10 text-center">
          <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
            {filter === "needs" && !query ? "Every subscription has someone in charge." : "No subscriptions match."}
          </Text>
          <Text as="span" className="text-[14px] text-ui-fg-subtle">
            {filter === "needs" && !query ? "Nothing will renew without a name attached." : "Try a different search."}
          </Text>
        </div>
      ) : (
        <Table className="w-full !text-[14px]">
          <Table.Header>
            <Table.Row className="!bg-ui-bg-subtle-hover hover:!bg-ui-bg-subtle-hover [&_th]:h-10 [&_th]:!px-3">
              {["Subscription", "In charge", "Cancel-by", "Assign"].map((header) => (
                <Table.HeaderCell key={header} className="!text-[14px] font-normal !text-ui-fg-subtle">
                  {header}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body className="[&_tr:last-child]:border-b-0">
            {visible.map(({ slug, row }) => {
              const status = statusDisplay[row.ownerStatus];
              const suggested = renewalDetails[slug]?.ownerOptions.find((name) =>
                available.some((person) => person.name === name),
              );
              return (
                <Table.Row
                  key={slug}
                  className={clx("[&_td]:h-[68px] [&_td]:!px-3", !row.owner && "bg-ui-tag-red-bg/30 hover:bg-ui-tag-red-bg/30")}
                >
                  <Table.Cell>
                    <Link href={`/renewals/${slug}`} className="flex items-center gap-3 hover:underline">
                      <Avatar src={row.logo} fallback={row.vendor.slice(0, 2).toUpperCase()} variant="squared" size="base" />
                      <span className="flex min-w-0 flex-col">
                        <Text as="span" className="truncate text-[14px] font-bold leading-5 text-ui-fg-base">
                          {row.vendor}
                        </Text>
                        <Text as="span" className="truncate text-[14px] leading-5 text-ui-fg-subtle">
                          {row.subtitle}
                        </Text>
                      </span>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col items-start gap-1">
                      {row.owner ? (
                        <span className="flex items-center gap-2">
                          <Avatar
                            src={avatarUrl(row.owner)}
                            fallback={initialsOf(row.owner)}
                            variant="rounded"
                            size="xsmall"
                          />
                          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
                            {row.owner}
                          </Text>
                          <Text as="span" className="text-[14px] leading-5 text-ui-fg-muted">
                            {row.team}
                          </Text>
                        </span>
                      ) : (
                        <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-error">
                          No one in charge
                          {row.formerOwner ? (
                            <span className="font-normal text-ui-fg-subtle"> · was {row.formerOwner}</span>
                          ) : null}
                        </Text>
                      )}
                      <StatusBadge color={status.color} className="!h-6 !text-[12px]">
                        {status.label}
                      </StatusBadge>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="flex flex-col">
                      <Text as="span" className="text-[14px] font-bold leading-5 text-ui-fg-base">
                        {row.cancelBy}
                      </Text>
                      <Text
                        as="span"
                        className={clx(
                          "text-[14px] leading-5",
                          row.timingTone === "danger"
                            ? "text-ui-fg-error"
                            : row.timingTone === "warning"
                              ? "text-ui-tag-orange-text"
                              : "text-ui-fg-subtle",
                        )}
                      >
                        {row.timing}
                      </Text>
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      {!row.owner && suggested ? (
                        <Button variant="primary" size="base" className="shrink-0" onClick={() => assign(slug, row.vendor, suggested)}>
                          Assign {suggested.split(" ")[0]}
                        </Button>
                      ) : null}
                      <select
                        aria-label={`${row.owner ? "Change" : "Choose"} owner for ${row.vendor}`}
                        value=""
                        onChange={(event) => event.target.value && assign(slug, row.vendor, event.target.value)}
                        className="h-8 w-[150px] rounded-md border border-ui-border-base bg-ui-bg-base px-2 text-[14px] text-ui-fg-base outline-none"
                      >
                        <option value="">{row.owner ? "Change…" : "Someone else…"}</option>
                        {available
                          .filter((person) => person.name !== row.owner)
                          .map((person) => (
                            <option key={person.name} value={person.name}>
                              {person.name} · {person.team}
                            </option>
                          ))}
                      </select>
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
    </SettingsCard>
  );
}
