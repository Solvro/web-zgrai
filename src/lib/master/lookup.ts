import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  max,
} from "drizzle-orm";
import { db } from "@/db";
import { activity, boxItem, message, participant } from "@/db/schema";
import { signMessages, spaceParticipantsById } from "@/lib/spaces/master";
import { getQuestionStatuses } from "./questions";
import { getProposalDetails } from "./votes";

type MessageKind = (typeof message.$inferSelect)["kind"];
type ActivityType = (typeof activity.$inferSelect)["type"];

function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function messageHistory(
  spaceId: string,
  options: { before?: number; limit: number },
) {
  const rows = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        options.before ? lt(message.id, options.before) : undefined,
      ),
    )
    .orderBy(desc(message.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit).reverse();
  return {
    messages: signMessages(page, await spaceParticipantsById(spaceId)),
    has_more: rows.length > options.limit,
    before: page[0]?.id ?? null,
  };
}

export async function searchMessages(
  spaceId: string,
  options: {
    query?: string;
    participantId?: string;
    fromMaster?: boolean;
    kind?: MessageKind;
    limit: number;
  },
) {
  const rows = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        options.query
          ? ilike(message.content, likePattern(options.query))
          : undefined,
        options.participantId
          ? eq(message.authorParticipantId, options.participantId)
          : undefined,
        options.fromMaster ? isNull(message.authorParticipantId) : undefined,
        options.kind ? eq(message.kind, options.kind) : undefined,
      ),
    )
    .orderBy(desc(message.id))
    .limit(options.limit);
  return {
    found: rows.length,
    messages: signMessages(
      rows.reverse(),
      await spaceParticipantsById(spaceId),
    ),
  };
}

// One message with the replies to it, plus its votes or answers when it is a
// proposal or a question.
export async function messageThread(spaceId: string, messageId: number) {
  const [root] = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), eq(message.id, messageId)));
  if (!root) throw new Error(`Message ${messageId} not found.`);
  const replies = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), eq(message.replyTo, messageId)))
    .orderBy(asc(message.id));
  const byId = await spaceParticipantsById(spaceId);
  const [proposal] =
    root.kind === "proposal"
      ? await getProposalDetails(spaceId, { ids: [root.id] })
      : [];
  const [question] =
    root.kind === "question"
      ? await getQuestionStatuses(spaceId, { ids: [root.id] })
      : [];
  return {
    message: signMessages([root], byId),
    replies: signMessages(replies, byId),
    proposal: proposal ?? null,
    question: question ?? null,
  };
}

export async function participantProfile(
  spaceId: string,
  participantId: string,
) {
  const [person] = await db
    .select()
    .from(participant)
    .where(
      and(eq(participant.spaceId, spaceId), eq(participant.id, participantId)),
    );
  if (!person) throw new Error(`Participant ${participantId} not found.`);

  const box = await db
    .select({
      item_id: boxItem.id,
      topic: boxItem.topic,
      content: boxItem.content,
      shared_at: boxItem.createdAt,
    })
    .from(boxItem)
    .where(
      and(eq(boxItem.participantId, person.id), isNull(boxItem.retractedAt)),
    )
    .orderBy(asc(boxItem.createdAt));
  const [said] = await db
    .select({ messages: count(), last: max(message.createdAt) })
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        eq(message.authorParticipantId, person.id),
      ),
    );
  const questions = await getQuestionStatuses(spaceId, { limit: 20 });
  const proposals = await getProposalDetails(spaceId, { limit: 20 });

  return {
    participant_id: person.id,
    represents: person.represents,
    role: person.role,
    harness: person.harness,
    joined_at: person.joinedAt.toISOString(),
    last_seen_at: person.lastSeenAt.toISOString(),
    left_at: person.leftAt?.toISOString() ?? null,
    messages_sent: said?.messages ?? 0,
    last_message_at: said?.last?.toISOString() ?? null,
    box: box.map((item) => ({
      ...item,
      shared_at: item.shared_at.toISOString(),
    })),
    unanswered_questions: questions
      .filter((q) => q.missing.some((m) => m.participant_id === person.id))
      .map((q) => ({
        question_id: q.question_id,
        question: q.question,
        deadline: q.deadline,
      })),
    not_voted_on: proposals
      .filter(
        (p) =>
          p.outcome === "pending" &&
          p.not_voted.some((m) => m.participant_id === person.id),
      )
      .map((p) => ({ proposal_id: p.proposal_id, content: p.content })),
  };
}

export async function activityLog(
  spaceId: string,
  options: { after?: number; types?: ActivityType[]; limit: number },
) {
  const rows = await db
    .select()
    .from(activity)
    .where(
      and(
        eq(activity.spaceId, spaceId),
        options.after ? gt(activity.id, options.after) : undefined,
        options.types?.length
          ? inArray(activity.type, options.types)
          : undefined,
      ),
    )
    .orderBy(desc(activity.id))
    .limit(options.limit);
  return rows.reverse().map((row) => ({
    id: row.id,
    type: row.type,
    from: row.actorParticipantId
      ? `participant:${row.actorParticipantId}`
      : "master",
    summary: row.summary,
    ref_id: row.refId,
    private: row.visibility === "private",
    at: row.createdAt.toISOString(),
  }));
}
