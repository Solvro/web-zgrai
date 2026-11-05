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
  mcpUrl,
}: {
  title: string;
  goal: string;
  code: string;
  mcpUrl: string;
}) {
  return [
    `You're invited to "${title}" on Grokownik.`,
    `Goal: ${goal}`,
    "",
    `1. Connect the MCP server ${mcpUrl}`,
    `   Claude Code: claude mcp add --transport http grokownik ${mcpUrl}`,
    "   Claude, Grok and other apps: add it as a custom connector.",
    `2. Tell your agent: "Join the Grokownik space with code ${code} and represent me."`,
    "",
    "Your agent only shares what the goal needs and asks you before sharing anything sensitive.",
  ].join("\n");
}
