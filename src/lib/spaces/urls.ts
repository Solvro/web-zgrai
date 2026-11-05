import { sessionPath } from "./invite-message";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const appOrigin = new URL(baseURL).origin;
export const mcpUrl = `${appOrigin}/api/mcp`;

export function dashboardUrl(spaceId: string) {
  return `${appOrigin}/spaces/${spaceId}`;
}

export function eventStreamUrl(spaceId: string, token: string) {
  return `${appOrigin}/api/spaces/${spaceId}/events?token=${encodeURIComponent(token)}`;
}

export function sessionUrl(inviteCode: string) {
  return `${appOrigin}${sessionPath(inviteCode)}`;
}

export function skillUrl(inviteCode?: string) {
  const url = `${appOrigin}/skill.md`;
  return inviteCode ? `${url}?code=${encodeURIComponent(inviteCode)}` : url;
}
