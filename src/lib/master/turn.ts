import { and, asc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { activity, masterSession, message, participant } from "@/db/schema";
import { getMasterContext } from "@/lib/spaces/master";
import { getSpaceOrThrow } from "@/lib/spaces/service";
import { endSpaceIfApproved } from "./final-plan";
import { ensureMasterSession, sendToMaster } from "./session";
import { cancelWakes, type MasterWake } from "./wake";

// Events that aren't messages. Joins, leaves and goal changes already show up
// as system messages in the transcript.
const ACTIVITY_EVENTS = [
  "vote",
  "shared_context",
  "retracted_context",
] as const;

function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function newActivity(spaceId: string, afterId: number) {
  return db
    .select()
    .from(activity)
    .where(
      and(
        eq(activity.spaceId, spaceId),
        gt(activity.id, afterId),
        inArray(activity.type, [...ACTIVITY_EVENTS]),
      ),
    )
    .orderBy(asc(activity.id));
}

// For each expired question: who it was for, and who hasn't said anything
// since it was asked.
async function expiredQuestions(spaceId: string, wakes: MasterWake[]) {
  const questionIds = wakes
    .filter((wake) => wake.kind === "deadline" && wake.refMessageId != null)
    .map((wake) => wake.refMessageId!);
  if (questionIds.length === 0) return [];

  const people = await db
    .select()
    .from(participant)
    .where(and(eq(participant.spaceId, spaceId), isNull(participant.leftAt)));
  const questions = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), inArray(message.id, questionIds)));

  const result = [];
  for (const question of questions) {
    const asked = question.addressedTo?.length
      ? people.filter((p) => question.addressedTo!.includes(p.id))
      : people;
    const replies = await db
      .select({ author: message.authorParticipantId })
      .from(message)
      .where(and(eq(message.spaceId, spaceId), gt(message.id, question.id)));
    const answered = new Set(replies.map((r) => r.author));
    const missing = asked.filter((p) => !answered.has(p.id));
    if (missing.length > 0) result.push({ question, missing });
  }
  return result;
}

// Runs one Master turn for a space: everything new since the Master's cursors,
// questions whose deadline passed, and the Master's own scheduled checks. The snapshot of the whole space comes
// from the agent's dynamic instructions, so this message only carries events.
export async function runMasterTurn(spaceId: string, wakes: MasterWake[]) {
  const row = await getSpaceOrThrow(spaceId);
  if (row.status === "closed") {
    await cancelWakes(spaceId);
    return;
  }
  const session = await ensureMasterSession(spaceId);
  if (session.endedAt) return;
  // Paused at its token budget: keep the cursors, so everything reaches the
  // Master once the initiator lets it continue.
  if (session.pausedAt) return;
  // Everyone approved the final plan: the space ends without another turn.
  if (await endSpaceIfApproved(spaceId)) return;

  const context = await getMasterContext(spaceId, session.lastMessageId);
  const activities = await newActivity(spaceId, session.lastActivityId);
  const expired = await expiredQuestions(spaceId, wakes);

  // The transcript also holds the Master's own recent messages. They alone
  // are no reason for a turn.
  const fromOthers = await db
    .select({ id: message.id })
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        gt(message.id, session.lastMessageId),
        or(isNotNull(message.authorParticipantId), eq(message.kind, "system")),
      ),
    )
    .limit(1);
  const checks = wakes.filter((wake) => wake.kind === "check");
  const hasNews =
    fromOthers.length > 0 ||
    activities.length > 0 ||
    expired.length > 0 ||
    checks.length > 0;
  const lastActivityId = activities.at(-1)?.id ?? session.lastActivityId;

  if (hasNews) {
    const parts: string[] = ["<events>"];
    if (context.transcript) parts.push(context.transcript);
    for (const item of activities) {
      const actor = item.actorParticipantId
        ? `participant:${item.actorParticipantId}`
        : "master";
      parts.push(
        `<activity id="${item.id}" type="${item.type}" from="${actor}">${escapeText(item.summary)}</activity>`,
      );
    }
    for (const { question, missing } of expired) {
      const names = missing.map(
        (p) => `participant:${p.id} (${escapeText(p.represents)})`,
      );
      parts.push(
        `<deadline question_id="${question.id}">The answer time ran out. No answer from: ${names.join(", ")}.</deadline>`,
      );
    }
    for (const check of checks) {
      parts.push(
        `<check every_minutes="${check.intervalMinutes}" reason="${escapeText(check.reason ?? "")}">Your scheduled check. Go through the success criteria and subproblems: mark what is met, move what is stuck, or end the turn without posting.</check>`,
      );
    }
    parts.push("</events>");
    parts.push(
      "Decide what the space needs next. Act through your tools. If nothing needs to be said, end the turn without posting.",
    );
    await sendToMaster(session.sessionId, parts.join("\n"));
  }

  await db
    .update(masterSession)
    .set({ lastMessageId: context.lastMessageId, lastActivityId })
    .where(eq(masterSession.spaceId, spaceId));
}
