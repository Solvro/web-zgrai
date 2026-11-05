import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 12 * 60 * 60 * 1000;

function sign(payload: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createStreamToken(participantId: string) {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${participantId}.${expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt) };
}

export function verifyStreamToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [participantId, expiresAt, signature] = parts;
  const expected = Buffer.from(sign(`${participantId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  if (Number(expiresAt) < Date.now()) return null;
  return participantId;
}
