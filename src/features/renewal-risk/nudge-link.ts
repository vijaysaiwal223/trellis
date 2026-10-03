/**
 * The one-click links in an owner nudge are credentials: they let someone record
 * a decision without logging in. A link works only if its signature checks out,
 * it was issued for this contract, and it hasn't already been used.
 */
const TOKEN_SECRET = "trellis-prototype-not-a-secret";

/** FNV-1a. A stand-in for an HMAC: enough to show tamper-detection in the prototype, not real security. */
function checksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const slugOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function mintToken(contractId: string, recipient: string): string {
  const payload = `${contractId}.${slugOf(recipient)}`;
  return `${payload}.${checksum(`${TOKEN_SECRET}|${payload}`)}`;
}

export type TokenCheck = { status: "valid" | "missing" | "forged" | "wrong-contract" | "used" };

export function validateToken(token: string | null | undefined, contractId: string, used: readonly string[]): TokenCheck {
  if (!token) return { status: "missing" };
  const cut = token.lastIndexOf(".");
  if (cut < 1 || checksum(`${TOKEN_SECRET}|${token.slice(0, cut)}`) !== token.slice(cut + 1)) return { status: "forged" };
  if (!token.startsWith(`${contractId}.`)) return { status: "wrong-contract" };
  if (used.includes(token)) return { status: "used" };
  return { status: "valid" };
}
