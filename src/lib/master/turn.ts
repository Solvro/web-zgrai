import { and, asc, eq, gt, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { activity, masterSession, message } from "@/db/schema";
import { getMasterContext } from "@/lib/spaces/master";
import { getSpaceOrThrow } from "@/lib/spaces/service";
import { endSpaceIfApproved } from "./final-plan";
import { getQuestionStatuses } from "./questions";
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

// Joins since the cursor. Each one gets an explicit cue in the turn, so the
// Master greets the newcomer instead of waiting for them to speak.
async function newJoins(spaceId: string, afterId: number) {
  return db
    .select({
      id: activity.id,
      participantId: activity.actorParticipantId,
      summary: activity.summary,
    })
    .from(activity)
    .where(
      and(
        eq(activity.spaceId, spaceId),
        gt(activity.id, afterId),
        eq(activity.type, "joined"),
      ),
    )
    .orderBy(asc(activity.id));
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

// Expired questions that still miss answers from someone.
async function expiredQuestions(spaceId: string, wakes: MasterWake[]) {
  const ids = wakes
    .filter((wake) => wake.kind === "deadline" && wake.refMessageId != null)
    .map((wake) => wake.refMessageId!);
  if (ids.length === 0) return [];
  const statuses = await getQuestionStatuses(spaceId, { ids });
  return statuses.filter((status) => status.missing.length > 0);
}

// Runs one Master turn for a space: everything new since the Master's cursors,
// questions whose deadline passed, and the Master's own checks and reminders.
// The snapshot of the whole space comes from the agent's dynamic
// instructions, so this message only carries events.
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
  const joins = await newJoins(spaceId, session.lastActivityId);
  const expired = await expiredQuestions(spaceId, wakes);
  const reminders = wakes.filter((wake) => wake.kind === "reminder");

  // The transcript also holds the Master's own recent messages. They alone
  // are no reason for a turn.
  const fromOthers = await db
    .select({ id: message.id, via: message.via })
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        gt(message.id, session.lastMessageId),
        or(isNotNull(message.authorParticipantId), eq(message.kind, "system")),
      ),
    );
  const checks = wakes.filter((wake) => wake.kind === "check");
  const hasNews =
    fromOthers.length > 0 ||
    activities.length > 0 ||
    expired.length > 0 ||
    checks.length > 0 ||
    reminders.length > 0;
  const lastActivityId = Math.max(
    session.lastActivityId,
    activities.at(-1)?.id ?? 0,
    joins.at(-1)?.id ?? 0,
  );
  const fromDashboard = fromOthers.some((m) => m.via === "dashboard");

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
    for (const { question_id, missing } of expired) {
      const names = missing.map(
        (p) => `participant:${p.participant_id} (${escapeText(p.represents)})`,
      );
      parts.push(
        `<deadline question_id="${question_id}">The answer time ran out. No answer from: ${names.join(", ")}.</deadline>`,
      );
    }
    for (const reminder of reminders) {
      parts.push(
        `<reminder id="${reminder.id}" set_at="${reminder.createdAt.toISOString()}">${escapeText(reminder.reason ?? "")}</reminder>`,
      );
    }
    for (const check of checks) {
      parts.push(
        `<check every_minutes="${check.intervalMinutes}" reason="${escapeText(check.reason ?? "")}">Your scheduled check. Go through the success criteria and subproblems: mark what is met, move what is stuck, or end the turn without posting.</check>`,
      );
    }
    parts.push("</events>");
    for (const join of joins) {
      if (!join.participantId) continue;
      parts.push(
        `participant:${join.participantId} just joined (${escapeText(join.summary)}). Greet them in one short message, say what the space decides and which step you are on, and ask them, with ask addressed to them, for what you need from them.`,
      );
    }
    if (fromDashboard) {
      parts.push(
        'The initiator wrote to you on the dashboard (via="dashboard"). Answer them in the space and act on what they asked, within your rules.',
      );
    }
    parts.push(
      "Decide what the space needs next and act through your tools. React to what participants said or asked so the current step keeps moving. End the turn without posting only if nothing new needs an answer.",
    );
    await sendToMaster(spaceId, session.sessionId, parts.join("\n"));
  }

  await db
    .update(masterSession)
    .set({ lastMessageId: context.lastMessageId, lastActivityId })
    .where(eq(masterSession.spaceId, spaceId));
}
