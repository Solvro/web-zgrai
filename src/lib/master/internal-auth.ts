import { createHash, timingSafeEqual } from "node:crypto";

// Shared secret between our Next.js server and the eve agent. Only server code
// talks to the Master; browsers and stakeholder agents never call /eve/v1.
// Falls back to a value derived from BETTER_AUTH_SECRET, so local setups work
// without another variable.
export function masterInternalToken() {
  const raw =
    process.env.MASTER_INTERNAL_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!raw) {
    throw new Error(
      "Set MASTER_INTERNAL_SECRET or BETTER_AUTH_SECRET for the Master agent.",
    );
  }
  return createHash("sha256").update(`zgrai-master:${raw}`).digest("hex");
}

export function isMasterInternalToken(token: string | null | undefined) {
  if (!token) return false;
  const expected = Buffer.from(masterInternalToken());
  const actual = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
