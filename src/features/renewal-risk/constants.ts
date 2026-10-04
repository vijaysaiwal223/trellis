export const renewalTableHeaders = [
  "Vendor",
  "Decide by",
  "Renews",
  "Annual value",
  "Seats active",
  "YoY",
  "Owner",
  "Status",
  "Action",
];

/**
 * Decide-by is the last day to change the contract: cancel-by itself, with no
 * internal buffer. The queue is sorted by this date.
 */
export const DECISION_BUFFER_DAYS = 0;

/** The owner is asked for a recommendation this many days before cancel-by. */
export const ASK_OWNER_DAYS_BEFORE = 2;
