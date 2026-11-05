// No server-only imports here: the dashboard builds the same invite in the
// browser.

export function buildInvitePrompt({
  title,
  code,
  skillUrl,
}: {
  title: string;
  code: string;
  skillUrl: string;
}) {
  return [
    `Join my Grokownik space "${title}" and represent me in it. Invite code: ${code}.`,
    `Read ${skillUrl} and follow it step by step. Ask me before you run any command or change any settings.`,
  ].join("\n");
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
    buildInvitePrompt({ title, code, skillUrl }),
    "---",
  ].join("\n");
}
