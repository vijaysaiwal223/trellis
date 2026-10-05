/**
 * The four answers to a renewal. "Right-size" is the stored value for
 * Downsize (kept so records saved before the rename still load).
 */
export type DecisionAction = "Renew" | "Right-size" | "Cancel" | "Renegotiate";

/** What a user sees for a stored action. */
export function actionLabel(action: string): string {
  return action === "Right-size" ? "Downsize" : action;
}

/**
 * Answers that change the contract, so the vendor needs written notice before
 * cancel-by. Renewing as-is needs no notice; renegotiating needs the vendor's
 * agreement but isn't a notice to leave or shrink.
 */
export function needsWrittenNotice(action: DecisionAction): boolean {
  return action === "Right-size" || action === "Cancel";
}
