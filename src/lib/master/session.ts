import { eq } from "drizzle-orm";
import { Client } from "eve/client";
import {
  APPROVE_OPTION_ID,
  emptySessionView,
  foldEvents,
  openInteractions,
} from "eve/events";
import { db } from "@/db";
import { masterSession } from "@/db/schema";
import { masterInternalToken } from "./internal-auth";

export type MasterSession = typeof masterSession.$inferSelect;

// Next.js proxies /eve/v1 to the agent in dev and in `next start`, so the
// server reaches it on its own origin. EVE_INTERNAL_URL overrides that.
function masterBaseUrl() {
  return (
    process.env.EVE_INTERNAL_URL ??
    `http://127.0.0.1:${process.env.PORT ?? 3000}`
  );
}

let client: Client | null = null;

function masterClient() {
  client ??= new Client({
    baseUrl: masterBaseUrl(),
    auth: { bearer: () => masterInternalToken() },
  });
  return client;
}

export async function getMasterSession(spaceId: string) {
  const [row] = await db
    .select()
    .from(masterSession)
    .where(eq(masterSession.spaceId, spaceId));
  return row ?? null;
}

// One eve session per space, created on first use. If two callers race, the
// loser's eve session stays unused and idles out.
export async function ensureMasterSession(spaceId: string) {
  const existing = await getMasterSession(spaceId);
  if (existing) return existing;
  const { session } = await masterClient().sessions.create();
  await db
    .insert(masterSession)
    .values({ spaceId, sessionId: session.id })
    .onConflictDoNothing({ target: masterSession.spaceId });
  return (await getMasterSession(spaceId))!;
}

// Queues one Master turn. eve runs turns of a session one after another, so a
// turn sent while another runs waits for it.
export async function sendToMaster(sessionId: string, text: string) {
  await masterClient().sessions.attach(sessionId).send(text);
}

export async function markMasterSessionEnded(spaceId: string) {
  await db
    .update(masterSession)
    .set({ endedAt: new Date() })
    .where(eq(masterSession.spaceId, spaceId));
}

// The budget prompt eve opens when the session hits limits.sessionUsage, if
// one is waiting for an answer.
export async function openBudgetPrompt(sessionId: string) {
  const snapshot = await masterClient().sessions.attach(sessionId).snapshot();
  const view = foldEvents(
    emptySessionView(),
    snapshot.events as Parameters<typeof foldEvents>[1],
  );
  return openInteractions(view, { kind: "budget" })[0] ?? null;
}

export async function approveBudget(sessionId: string, interactionId: string) {
  await masterClient()
    .sessions.attach(sessionId)
    .respond([{ interactionId, optionId: APPROVE_OPTION_ID }]);
}
