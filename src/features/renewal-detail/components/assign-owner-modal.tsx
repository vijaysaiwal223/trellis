"use client";

import { Avatar, Checkbox, Table, Text, clx } from "@medusajs/ui";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { avatarUrl, people } from "@/config/people";

import type { RenewalDetail } from "../types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type AssignOwnerModalProps = {
  detail: RenewalDetail;
  previousOwnerName?: string;
  previousOwnerDeparted: boolean;
  suggestedOwner?: string;
  isPastCancelBy: boolean;
  onAssign: (name: string) => void;
  onClose: () => void;
};

export function AssignOwnerModal({
  detail,
  previousOwnerName,
  previousOwnerDeparted,
  suggestedOwner,
  isPastCancelBy,
  onAssign,
  onClose,
}: AssignOwnerModalProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(suggestedOwner ?? people[0].name);
  const [notify, setNotify] = useState(true);

  const annualContract = detail.contactDetails.find((row) => row.label === "Annual contract")?.value;
  const cancelBy = detail.timeline.find((point) => point.label === "Cancel-by")?.date;

  const filtered = useMemo(() => {
    // Recommended candidate always leads the list, even mid-search.
    const sorted = [...people].sort((a, b) =>
      a.name === suggestedOwner ? -1 : b.name === suggestedOwner ? 1 : 0,
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (person) => person.name.toLowerCase().includes(q) || person.team.toLowerCase().includes(q),
    );
  }, [query, suggestedOwner]);

  return (
    <div className="flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout">
      <div className="flex items-start justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex flex-col">
          <Text as="span" className="text-[16px] font-medium leading-6 text-ui-fg-base">
            Assign owner for {detail.vendor}
          </Text>
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
            {detail.vendor} · {detail.subtitle}
          </Text>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </div>

      <div className="flex w-full flex-col gap-4 overflow-y-auto p-4">
        {previousOwnerName ? (
          <Alert
            tone={previousOwnerDeparted ? "danger" : "neutral"}
            title={`Previous owner: ${previousOwnerName} — ${previousOwnerDeparted ? "Departed" : "Unassigned"}`}
            description={
              previousOwnerDeparted
                ? "This owner is no longer with the company. Assign a new owner to ensure continuity."
                : "This subscription currently has no accountable owner."
            }
          />
        ) : null}

        <div className="flex items-center gap-2 rounded-[8px] border border-ui-border-base bg-ui-bg-base px-3 py-2">
          <Text as="span" className="text-ui-fg-muted">
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Text>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people or teams..."
            className="w-full bg-transparent text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </div>

        <div className="overflow-hidden rounded-[8px] border border-ui-border-base">
          <Table>
            <Table.Header>
              <Table.Row className="!bg-ui-bg-subtle-hover hover:!bg-ui-bg-subtle-hover [&_th]:h-9 [&_th]:!px-3">
                <Table.HeaderCell className="!w-10" />
                <Table.HeaderCell className="!text-[12px] font-normal !text-ui-fg-subtle">Name</Table.HeaderCell>
                <Table.HeaderCell className="!text-[12px] font-normal !text-ui-fg-subtle">Team</Table.HeaderCell>
                <Table.HeaderCell className="!w-[120px]" />
              </Table.Row>
            </Table.Header>
            <Table.Body className="[&_tr:last-child]:border-b-0">
              {filtered.map((person) => {
                const isSelected = selected === person.name;
                const isRecommended = person.name === suggestedOwner;
                return (
                  <Table.Row
                    key={person.name}
                    onClick={() => setSelected(person.name)}
                    className={clx(
                      "cursor-pointer [&_td]:h-14 [&_td]:!px-3",
                      isSelected && "!bg-ui-bg-interactive-soft hover:!bg-ui-bg-interactive-soft",
                    )}
                  >
                    <Table.Cell>
                      <span
                        className={clx(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected ? "border-ui-bg-interactive" : "border-ui-border-strong",
                        )}
                      >
                        {isSelected ? <span className="size-2 rounded-full bg-ui-bg-interactive" /> : null}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={avatarUrl(person.name)}
                          fallback={initials(person.name)}
                          variant="rounded"
                          size="small"
                        />
                        <Text as="span" className="text-[14px] font-medium text-ui-fg-base">
                          {person.name}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Text as="span" className="text-[14px] text-ui-fg-subtle">
                        {person.team}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {isRecommended ? (
                        <span className="rounded-full bg-ui-bg-interactive-soft px-2 py-1 text-[12px] font-medium text-ui-fg-interactive">
                          Recommended
                        </span>
                      ) : null}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
          {filtered.length === 0 ? (
            <Text as="p" className="px-3 py-4 text-[14px] text-ui-fg-muted">
              No one matches &ldquo;{query}&rdquo;.
            </Text>
          ) : null}
        </div>

        <label className="flex items-center gap-2">
          <Checkbox checked={notify} onCheckedChange={(checked) => setNotify(checked === true)} />
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            Send notification
          </Text>
        </label>
        <Text as="p" className="-mt-3 text-[12px] leading-4 text-ui-fg-subtle">
          The owner will be notified by email about this assignment.
        </Text>

        {notify ? (
          <div className="flex items-start gap-2 rounded-[8px] border border-ui-border-base bg-ui-bg-subtle p-3">
            <Text as="span" className="text-ui-fg-interactive">
              ✉
            </Text>
            <div className="flex flex-col gap-0.5">
              <Text as="span" className="text-[12px] font-medium uppercase tracking-wide text-ui-fg-muted">
                Notification preview
              </Text>
              <Text as="span" className="text-[14px] leading-5 text-ui-fg-base">
                Hi {selected.split(" ")[0]}, you&apos;ve been assigned as the owner for the {detail.vendor} renewal
                {annualContract ? ` (${annualContract})` : ""}.{" "}
                {isPastCancelBy
                  ? "The cancel window has already passed — a decision is needed."
                  : cancelBy
                    ? `Cancel-by is ${cancelBy} — please review and decide.`
                    : ""}
              </Text>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-end gap-3 border-t border-ui-border-base p-4">
        <Button variant="secondary" size="base" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="base"
          onClick={() => {
            onAssign(selected);
            onClose();
          }}
        >
          {notify ? "Assign and notify" : "Assign owner"}
        </Button>
      </div>
    </div>
  );
}
