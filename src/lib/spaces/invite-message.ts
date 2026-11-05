// No server-only imports here, so client components can format it too.

export function sessionPath(code: string) {
  return `/s/${code.replace(/[^A-Za-z0-9]/g, "").toLowerCase()}`;
}

export function buildInviteMessage({
  origin,
  code,
}: {
  origin: string;
  code: string;
}) {
  return [
    "Join my zgrai.solvro.pl session and represent me. Read the skill and follow it.",
    `Skill    ${origin}/skill.md`,
    `Session  ${origin}${sessionPath(code)}`,
    `Token    ${code}`,
  ].join("\n");
}
