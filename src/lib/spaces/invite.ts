import { createHash, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode() {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const part = () => Array.from({ length: 3 }, pick).join("");
  return `${part()}-${part()}`;
}

export function normalizeInviteCode(code: string) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 6 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

export { buildInviteMessage } from "./invite-message";
