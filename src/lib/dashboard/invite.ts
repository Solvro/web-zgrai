import {
  buildInviteMessage,
  buildInvitePrompt,
} from "@/lib/spaces/invite-message";

// Same alphabet as the server's codes: no 0/O or 1/I/L.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode() {
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const part = () => Array.from({ length: 3 }, pick).join("");
  return `${part()}-${part()}`;
}

export function mcpUrl(origin: string) {
  return `${origin}/api/mcp`;
}

export function joinUrl(origin: string, code: string) {
  return `${origin}/join/${code}`;
}

export function skillUrl(origin: string, code: string) {
  return `${origin}/skill.md?code=${encodeURIComponent(code)}`;
}

export function claudeCodeCommand(origin: string) {
  return `claude mcp add --transport http --scope user grokownik ${mcpUrl(origin)}`;
}

type InviteInput = {
  title: string;
  goal: string;
  code: string;
  origin: string;
};

// The text a person pastes into their agent. The skill does the rest.
export function invitePrompt({ title, code, origin }: InviteInput) {
  return buildInvitePrompt({ title, code, skillUrl: skillUrl(origin, code) });
}

export function inviteMessage({ title, goal, code, origin }: InviteInput) {
  return buildInviteMessage({
    title,
    goal,
    code,
    skillUrl: skillUrl(origin, code),
  });
}

// Opens a new Claude chat with the prompt filled in.
export function claudeAiLink(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
