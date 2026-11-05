import { and, asc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { masterWake } from "@/db/schema";

// Events arriving within this window become one Master turn.
export const DEBOUNCE_MS = 5_000;

// How long participants have to answer a Master question by default.
export const DEFAULT_DEADLINE_MINUTES = Number(process.env.MASTER_DEFAULT_DEADLINE_MINUTES ?? 10);

// A claimed row that never finished (crash mid-turn) is picked up again.
const CLAIM_TIMEOUT_MS = 2 * 60_000;

export type MasterWake = typeof masterWake.$inferSelect;

// Opens a batch for the space, or joins the open one. The window starts at the
// first event and isn't extended, so a chatty space still gets regular turns.
export async function scheduleDebounce(spaceId: string, delayMs = DEBOUNCE_MS) {
  await db
    .insert(masterWake)
    .values({ spaceId, kind: "debounce", dueAt: new Date(Date.now() + delayMs) })
    .onConflictDoNothing();
}

export async function scheduleDeadline(spaceId: string, questionId: number, minutes: number) {
  const dueAt = new Date(Date.now() + minutes * 60_000);
  await db
    .insert(masterWake)
    .values({ spaceId, kind: "deadline", dueAt, refMessageId: questionId });
  return dueAt;
}

export async function claimDueWakes(limit = 20) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const stale = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
    const rows = await tx
      .select()
      .from(masterWake)
      .where(
        and(
          isNull(masterWake.doneAt),
          lte(masterWake.dueAt, now),
          or(isNull(masterWake.claimedAt), lt(masterWake.claimedAt, stale)),
        ),
      )
      .orderBy(asc(masterWake.dueAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    await tx
      .update(masterWake)
      .set({ claimedAt: now })
      .where(inArray(masterWake.id, rows.map((row) => row.id)));
    return rows;
  });
}

export async function completeWakes(ids: number[]) {
  if (ids.length === 0) return;
  await db.update(masterWake).set({ doneAt: new Date() }).where(inArray(masterWake.id, ids));
}

// Questions whose deadline hasn't passed yet, for the Master's snapshot.
export async function pendingDeadlines(spaceId: string) {
  return db
    .select({ questionId: masterWake.refMessageId, dueAt: masterWake.dueAt })
    .from(masterWake)
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "deadline"),
        isNull(masterWake.doneAt),
      ),
    )
    .orderBy(asc(masterWake.dueAt));
}

// Stops pending wakes, e.g. once the space is closed.
export async function cancelWakes(spaceId: string) {
  await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(and(eq(masterWake.spaceId, spaceId), isNull(masterWake.doneAt)));
}
