import { buildSkill } from "@/lib/skill/template";
import { normalizeInviteCode } from "@/lib/spaces/invite";
import { mcpUrl, skillUrl } from "@/lib/spaces/urls";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("code");
  const inviteCode = raw ? normalizeInviteCode(raw) : undefined;
  const body = buildSkill({
    mcpUrl,
    skillUrl: skillUrl(),
    inviteCode: inviteCode && /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(inviteCode) ? inviteCode : undefined,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
