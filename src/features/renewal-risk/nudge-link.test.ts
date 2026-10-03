import { describe, expect, it } from "vitest";

import { mintToken, validateToken } from "./nudge-link";

describe("one-click link permissions", () => {
  const token = mintToken("salesforce", "Rohan Mehta");

  it("accepts a link issued for this contract", () => {
    expect(validateToken(token, "salesforce", []).status).toBe("valid");
  });

  it("rejects a missing link", () => {
    expect(validateToken(null, "salesforce", []).status).toBe("missing");
  });

  it("rejects a tampered link", () => {
    expect(validateToken(token.replace(/\.[^.]+$/, ".abc"), "salesforce", []).status).toBe("forged");
    expect(validateToken(token.replace("rohan", "maya"), "salesforce", []).status).toBe("forged");
  });

  it("rejects a link used on a different contract", () => {
    expect(validateToken(token, "zoom", []).status).toBe("wrong-contract");
  });

  it("rejects a link that was already used", () => {
    expect(validateToken(token, "salesforce", [token]).status).toBe("used");
  });
});
