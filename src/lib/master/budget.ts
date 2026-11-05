import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { masterSession, message, space } from "@/db/schema";
import {
  getParticipantOrThrow,
  getSpaceOrThrow,
  recordActivity,
  SpaceError,
} from "@/lib/spaces/service";
import { approveBudget, openBudgetPrompt } from "./session";
import { scheduleDebounce } from "./wake";

async function postSystemNotice(spaceId: string, content: string) {
  const [row] = await db
    .insert(message)
    .values({ spaceId, kind: "system", content })
    .returning();
  await recordActivity(db, {
    spaceId,
    actorParticipantId: null,
    type: "message",
    refId: row.id,
    summary: content,
  });
}

// eve pauses a session at its budget and waits for a person to answer. Only
// our server talks to the session, so we look for that prompt and hand the
// decision to the initiator instead of letting the space hang silently.
export async function detectBudgetPauses() {
  const running = await db
    .select({
      spaceId: masterSession.spaceId,
      sessionId: masterSession.sessionId,
    })
    .from(masterSession)
    .innerJoin(space, eq(space.id, masterSession.spaceId))
    .where(
      and(
        isNull(masterSession.endedAt),
        isNull(masterSession.pausedAt),
        eq(space.status, "open"),
      ),
    );

  for (const session of running) {
    const prompt = await openBudgetPrompt(session.sessionId).catch(
      () => null,
    );
    if (!prompt) continue;
    await db
      .update(masterSession)
      .set({ pausedAt: new Date(), budgetInteractionId: prompt.interactionId })
      .where(eq(masterSession.spaceId, session.spaceId));
    await postSystemNotice(
      session.spaceId,
      "The Master used up its token budget and paused. The initiator decides: continue it with continue_master, or close the space.",
    );
  }
}

export async function isMasterPaused(spaceId: string) {
  const [row] = await db
    .select({ id: masterSession.spaceId })
    .from(masterSession)
    .where(
      and(
        eq(masterSession.spaceId, spaceId),
        isNotNull(masterSession.pausedAt),
      ),
    );
  return Boolean(row);
}

// The initiator lets a paused Master continue with a fresh budget window.
export async function continueMaster(input: {
  spaceId: string;
  userId: string;
}) {
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  if (me.role !== "initiator") {
    throw new SpaceError("Only the initiator can let the Master continue.");
  }
  const row = await getSpaceOrThrow(input.spaceId);
  if (row.status !== "open") {
    throw new SpaceError(`Space "${row.title}" is ${row.status}.`);
  }
  const [session] = await db
    .select()
    .from(masterSession)
    .where(eq(masterSession.spaceId, input.spaceId));
  if (!session?.pausedAt || !session.budgetInteractionId) {
    throw new SpaceError("The Master isn't paused.");
  }

  await approveBudget(session.sessionId, session.budgetInteractionId);
  await db
    .update(masterSession)
    .set({ pausedAt: null, budgetInteractionId: null })
    .where(eq(masterSession.spaceId, input.spaceId));
  await postSystemNotice(
    input.spaceId,
    `${me.represents} let the Master continue with a new token budget.`,
  );
  // Deliver everything that happened while it was paused.
  await scheduleDebounce(input.spaceId, 0);
}
