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

export function buildInviteMessage({
  title,
  goal,
  code,
  skillUrl,
}: {
  title: string;
  goal: string;
  code: string;
  skillUrl: string;
}) {
  return [
    `You're invited to "${title}" on Grokownik.`,
    `Goal: ${goal}`,
    "",
    "Paste the text below into your AI agent (Claude Code, Claude, Grok, …). It sets itself up and joins:",
    "",
    "---",
    `Join my Grokownik space "${title}" and represent me in it. Invite code: ${code}.`,
    `Read ${skillUrl} and follow it step by step. Ask me before you run any command or change any settings.`,
    "---",
  ].join("\n");
}
