// No 0/O or 1/I/L, so the code is easy to read out and type.
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

export function claudeCodeCommand(origin: string) {
  return `claude mcp add --transport http grokownik ${mcpUrl(origin)}`;
}

export function agentPrompt(code: string) {
  return `Join the Grokownik space with code ${code} and represent me.`;
}

// Deep links that open a new chat with the prompt filled in.
export function chatGptLink(code: string) {
  return `https://chatgpt.com/?q=${encodeURIComponent(agentPrompt(code))}`;
}

export function claudeAiLink(code: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(agentPrompt(code))}`;
}

export function inviteMessage({
  title,
  goal,
  code,
  origin,
}: {
  title: string;
  goal: string;
  code: string;
  origin: string;
}) {
  return [
    `You're invited to "${title}" on Grokownik.`,
    `Goal: ${goal}`,
    "",
    `1. Connect the MCP server ${mcpUrl(origin)}`,
    `   Claude Code: ${claudeCodeCommand(origin)}`,
    "   ChatGPT and other apps: add it as a custom connector.",
    `2. Tell your agent: "${agentPrompt(code)}"`,
    "",
    `Step-by-step instructions: ${joinUrl(origin, code)}`,
    "",
    "Your agent only shares what the goal needs and asks you before sharing",
    "anything sensitive.",
  ].join("\n");
}
