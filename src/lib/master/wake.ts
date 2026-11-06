import { and, asc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { masterWake } from "@/db/schema";

// A Master turn starts once the space has been quiet this long after an
// event, but never later than DEBOUNCE_MAX_MS after the first event.
export const DEBOUNCE_MS = 10_000;
const DEBOUNCE_MAX_MS = 30_000;

// How long participants have to answer a Master question by default.
export const DEFAULT_DEADLINE_MINUTES = Number(
  process.env.MASTER_DEFAULT_DEADLINE_MINUTES ?? 10,
);

// A claimed row that never finished (crash mid-turn) is picked up again.
const CLAIM_TIMEOUT_MS = 2 * 60_000;

export type MasterWake = typeof masterWake.$inferSelect;

// Opens a batch for the space, or joins the open one and moves it back by
// `delayMs`. A delay of 0 fires the batch right away.
export async function scheduleDebounce(spaceId: string, delayMs = DEBOUNCE_MS) {
  const now = Date.now();
  await db.transaction(async (tx) => {
    const [pending] = await tx
      .select()
      .from(masterWake)
      .where(
        and(
          eq(masterWake.spaceId, spaceId),
          eq(masterWake.kind, "debounce"),
          isNull(masterWake.claimedAt),
          isNull(masterWake.doneAt),
        ),
      )
      .for("update");
    if (!pending) {
      await tx
        .insert(masterWake)
        .values({
          spaceId,
          kind: "debounce",
          dueAt: new Date(now + delayMs),
          createdAt: new Date(now),
        })
        .onConflictDoNothing();
      return;
    }
    if (pending.dueAt.getTime() <= now) return;
    const dueAt = Math.min(
      now + delayMs,
      pending.createdAt.getTime() + DEBOUNCE_MAX_MS,
    );
    if (dueAt === pending.dueAt.getTime()) return;
    await tx
      .update(masterWake)
      .set({ dueAt: new Date(dueAt) })
      .where(eq(masterWake.id, pending.id));
  });
}

export async function scheduleDeadline(
  spaceId: string,
  questionId: number,
  minutes: number,
) {
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
      .where(
        inArray(
          masterWake.id,
          rows.map((row) => row.id),
        ),
      );
    return rows;
  });
}

export async function completeWakes(ids: number[]) {
  if (ids.length === 0) return;
  await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(inArray(masterWake.id, ids));
}

// Stops pending wakes, e.g. once the space is closed.
export async function cancelWakes(spaceId: string) {
  await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(and(eq(masterWake.spaceId, spaceId), isNull(masterWake.doneAt)));
}

// Self-scheduled check-ins: the Master asks to be woken every few minutes to
// review the criteria and stages, even when nobody writes. One per space.
export const CHECK_MIN_MINUTES = 5;
export const CHECK_MAX_MINUTES = 60;

export async function cancelChecks(spaceId: string) {
  await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "check"),
        isNull(masterWake.doneAt),
      ),
    );
}

// Replaces the space's active check.
export async function scheduleCheck(
  spaceId: string,
  everyMinutes: number,
  reason: string,
) {
  await cancelChecks(spaceId);
  return queueCheck(spaceId, everyMinutes, reason);
}

async function queueCheck(
  spaceId: string,
  everyMinutes: number,
  reason: string,
) {
  const dueAt = new Date(Date.now() + everyMinutes * 60_000);
  await db
    .insert(masterWake)
    .values({
      spaceId,
      kind: "check",
      dueAt,
      intervalMinutes: everyMinutes,
      reason,
    })
    .onConflictDoNothing();
  return dueAt;
}

// After a check fired: queue the next one, unless cancel_check or a new
// schedule_check replaced it while the turn ran.
export async function repeatCheck(wake: MasterWake) {
  if (wake.kind !== "check" || !wake.intervalMinutes) return;
  const [current] = await db
    .select({ doneAt: masterWake.doneAt })
    .from(masterWake)
    .where(eq(masterWake.id, wake.id));
  if (current?.doneAt) return;
  await completeWakes([wake.id]);
  await queueCheck(wake.spaceId, wake.intervalMinutes, wake.reason ?? "");
}

export async function activeCheck(spaceId: string) {
  const [row] = await db
    .select({
      everyMinutes: masterWake.intervalMinutes,
      reason: masterWake.reason,
      dueAt: masterWake.dueAt,
    })
    .from(masterWake)
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "check"),
        isNull(masterWake.doneAt),
      ),
    );
  return row ?? null;
}

// One-off reminders: unlike the recurring check, the Master can set several,
// each with its own note.
export async function scheduleReminder(
  spaceId: string,
  minutes: number,
  note: string,
) {
  const dueAt = new Date(Date.now() + minutes * 60_000);
  const [row] = await db
    .insert(masterWake)
    .values({ spaceId, kind: "reminder", dueAt, reason: note })
    .returning();
  return row;
}

export async function pendingReminders(spaceId: string) {
  return db
    .select({
      id: masterWake.id,
      dueAt: masterWake.dueAt,
      note: masterWake.reason,
    })
    .from(masterWake)
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "reminder"),
        isNull(masterWake.doneAt),
      ),
    )
    .orderBy(asc(masterWake.dueAt));
}

export async function cancelReminder(spaceId: string, reminderId: number) {
  const rows = await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(
      and(
        eq(masterWake.id, reminderId),
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "reminder"),
        isNull(masterWake.doneAt),
      ),
    )
    .returning({ id: masterWake.id });
  return rows.length > 0;
}

// Stops waiting for answers to a question.
export async function cancelDeadline(spaceId: string, questionId: number) {
  const rows = await db
    .update(masterWake)
    .set({ doneAt: new Date() })
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "deadline"),
        eq(masterWake.refMessageId, questionId),
        isNull(masterWake.doneAt),
      ),
    )
    .returning({ id: masterWake.id });
  return rows.length > 0;
}

// Moves a question's deadline to `minutes` from now, or sets a new one if the
// old one already fired.
export async function rescheduleDeadline(
  spaceId: string,
  questionId: number,
  minutes: number,
) {
  await cancelDeadline(spaceId, questionId);
  return scheduleDeadline(spaceId, questionId, minutes);
}
