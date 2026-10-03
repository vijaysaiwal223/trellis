"use client";

import { Avatar, Checkbox, Table, Text, clx } from "@medusajs/ui";
import { RiCloseLine, RiMailLine, RiSearchLine } from "@remixicon/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { avatarUrl } from "@/config/people";

import { localOwnerRecommendation, type OwnerRecommendation, type OwnerRecommendationRequest } from "../owner-recommendation";
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
  recommendationFacts: OwnerRecommendationRequest;
  isPastCancelBy: boolean;
  onAssign: (name: string) => void;
  onClose: () => void;
};

export function AssignOwnerModal({
  detail,
  previousOwnerName,
  previousOwnerDeparted,
  recommendationFacts,
  isPastCancelBy,
  onAssign,
  onClose,
}: AssignOwnerModalProps) {
  const [query, setQuery] = useState("");
  const fallback = useMemo(() => localOwnerRecommendation(recommendationFacts), [recommendationFacts]);
  const [recommendation, setRecommendation] = useState<OwnerRecommendation>(fallback);
  const [source, setSource] = useState<"loading" | "ai" | "local">("loading");
  const [selected, setSelected] = useState(fallback.name);
  const [showPreview, setShowPreview] = useState(false);
  const changedSelection = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/owner-recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recommendationFacts),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Recommendation unavailable");
        return response.json() as Promise<OwnerRecommendation>;
      })
      .then((answer) => {
        if (!recommendationFacts.candidates.some((candidate) => candidate.name === answer.name)) {
          throw new Error("Invalid owner recommendation");
        }
        setRecommendation(answer);
        setSource("ai");
        if (!changedSelection.current) setSelected(answer.name);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSource("local");
      });
    return () => controller.abort();
  }, [recommendationFacts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const annualContract = detail.contactDetails.find((row) => row.label === "Annual contract")?.value;
  const cancelBy = detail.timeline.find((point) => point.label === "Cancel-by")?.date;

  const filtered = useMemo(() => {
    const sorted = [...recommendationFacts.candidates].sort((a, b) =>
      a.name === recommendation.name ? -1 : b.name === recommendation.name ? 1 : 0,
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (person) => person.name.toLowerCase().includes(q) || person.team.toLowerCase().includes(q),
    );
  }, [query, recommendation.name, recommendationFacts.candidates]);

  const selectOwner = (name: string) => {
    changedSelection.current = true;
    setSelected(name);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="assign-owner-title" className="flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout">
      <div className="flex items-start justify-between gap-3 border-b border-ui-border-base px-4 py-3">
        <div className="flex flex-col">
          <Text as="span" id="assign-owner-title" className="text-[16px] font-medium leading-6 text-ui-fg-base">
            Assign owner for {detail.vendor}
          </Text>
          <Text as="span" className="text-[12px] leading-4 text-ui-fg-subtle">
            {detail.subtitle} renewal
          </Text>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto p-4">
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

        <div className="shrink-0 rounded-[10px] border border-[#bfd5ff] bg-ui-bg-interactive-soft p-3" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text as="p" className="text-[12px] font-semibold text-ui-fg-interactive">
                {source === "loading" ? "Bruno is reviewing owner fit…" : source === "ai" ? "Bruno suggests" : "Suggested from Trellis data"}
              </Text>
              <div className="mt-2 flex items-center gap-2">
                <Avatar src={avatarUrl(recommendation.name)} fallback={initials(recommendation.name)} variant="rounded" size="small" />
                <Text as="p" className="text-[14px] font-semibold text-ui-fg-base">
                  {recommendation.name}
                  <span className="font-normal text-ui-fg-subtle"> · {recommendationFacts.candidates.find((person) => person.name === recommendation.name)?.team}</span>
                </Text>
              </div>
              <Text as="p" className="mt-2 text-[13px] leading-5 text-ui-fg-subtle">{recommendation.reason}</Text>
            </div>
            {selected !== recommendation.name ? (
              <Button variant="secondary" size="small" onClick={() => selectOwner(recommendation.name)}>
                Select
              </Button>
            ) : null}
          </div>
          <Text as="p" className="mt-2 text-[12px] leading-4 text-ui-fg-muted">
            Based on team and renewals in Trellis. Confirm availability and vendor context before assigning.
          </Text>
        </div>

        <label className="flex items-center gap-2 rounded-[8px] border border-ui-border-base bg-ui-bg-base px-3 py-2">
          <RiSearchLine className="size-4 shrink-0 text-ui-fg-muted" />
          <span className="sr-only">Search people or teams</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people or teams..."
            className="w-full bg-transparent text-[14px] text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </label>

        <div className="max-h-[230px] shrink-0 overflow-y-auto rounded-[8px] border border-ui-border-base">
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
                const isRecommended = person.name === recommendation.name;
                return (
                  <Table.Row
                    key={person.name}
                    onClick={() => selectOwner(person.name)}
                    className={clx(
                      "cursor-pointer [&_td]:h-14 [&_td]:!px-3",
                      isSelected && "!bg-ui-bg-interactive-soft hover:!bg-ui-bg-interactive-soft",
                    )}
                  >
                    <Table.Cell>
                      <input
                        type="radio"
                        name="renewal-owner"
                        value={person.name}
                        checked={isSelected}
                        onChange={() => selectOwner(person.name)}
                        aria-label={`Assign ${person.name} from ${person.team}`}
                        className="size-4 accent-[#2e77f8]"
                      />
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
                          Suggested
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
          <Checkbox checked={showPreview} onCheckedChange={(checked) => setShowPreview(checked === true)} />
          <Text as="span" className="text-[14px] font-medium leading-5 text-ui-fg-base">
            Show email preview
          </Text>
        </label>
        <Text as="p" className="-mt-3 text-[12px] leading-4 text-ui-fg-subtle">
          Email delivery is not connected yet. Assigning an owner updates Trellis only.
        </Text>

        {showPreview ? (
          <div className="flex items-start gap-2 rounded-[8px] border border-ui-border-base bg-ui-bg-subtle p-3">
            <RiMailLine className="size-4 shrink-0 text-ui-fg-interactive" />
            <div className="flex flex-col gap-0.5">
              <Text as="span" className="text-[12px] font-medium uppercase tracking-wide text-ui-fg-muted">
                Email draft preview
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
          Assign owner
        </Button>
      </div>
    </div>
  );
}
