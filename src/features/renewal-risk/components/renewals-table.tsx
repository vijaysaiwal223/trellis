"use client";

import { Table, Text, clx } from "@medusajs/ui";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

import { renewalTableHeaders } from "../constants";
import { matchesMetric, type MetricKey } from "../metrics";
import type { RenewalSeed } from "../types";
import { useAssessedRenewals } from "../use-assessed-renewals";

import { RenewalRow } from "./renewal-row";

type RenewalsTableProps = {
  renewals: RenewalSeed[];
  filterKey?: MetricKey | null;
  onClearFilter?: () => void;
};

export function RenewalsTable({ renewals, filterKey, onClearFilter }: RenewalsTableProps) {
  const assessed = useAssessedRenewals(renewals);

  // The queue is ranked by urgency, not calendar order. Renewals that already
  // have a recorded decision drop below everything still waiting on someone.
  const rows = useMemo(() => {
    const scoped = filterKey ? assessed.filter((entry) => matchesMetric(filterKey, entry)) : assessed;
    return [...scoped].sort(
      (a, b) => Number(a.resolved) - Number(b.resolved) || b.row.urgency - a.row.urgency,
    );
  }, [assessed, filterKey]);

  return (
    <section className="mt-6 w-full overflow-x-auto rounded-[12px] border border-t-0 border-b-0 border-ui-border-base">
      {filterKey ? (
        <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-subtle-hover px-3 py-2">
          <Text as="span" className="text-[14px] text-ui-fg-subtle">
            Showing {rows.length} filtered renewal{rows.length === 1 ? "" : "s"}
          </Text>
          <Button variant="secondary" size="small" onClick={onClearFilter}>
            Clear filter
          </Button>
        </div>
      ) : null}
      <Table className="min-w-[1240px] table-fixed !text-[14px]">
        <Table.Header>
          <Table.Row className="!bg-ui-bg-subtle-hover hover:!bg-ui-bg-subtle-hover [&_th]:h-10 [&_th]:!px-3 [&_th:first-child]:!pl-3 [&_th:last-child]:!pr-3">
            {renewalTableHeaders.map((header, index) => (
              <Table.HeaderCell
                key={header}
                className={clx(
                  "!text-[14px] font-normal !text-ui-fg-subtle",
                  index === 0 && "!w-[200px]",
                )}
              >
                {header}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body className="[&_tr:last-child]:border-b-0">
          {rows.length === 0 ? (
            <Table.Row>
              <td colSpan={renewalTableHeaders.length} className="h-24 text-center text-ui-fg-muted">
                No renewals match this filter.
              </td>
            </Table.Row>
          ) : (
            rows.map(({ row }) => <RenewalRow key={row.vendor} row={row} />)
          )}
        </Table.Body>
      </Table>
    </section>
  );
}
