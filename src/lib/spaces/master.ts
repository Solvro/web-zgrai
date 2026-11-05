import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { setMessageMeta, tagWithCurrentStep } from "@/lib/master/meta";
import {
  activity,
  boardItem,
  boxItem,
  message,
  participant,
} from "@/db/schema";
import {
  closeSpace,
  getSpaceOrThrow,
  listParticipants,
  recordActivity,
  truncate,
  voteTally,
} from "./service";

type MasterMessageInput = {
  spaceId: string;
  text: string;
  kind?: "message" | "question" | "proposal" | "decision";
  addressedTo?: string[];
  privateTo?: string[];
  replyTo?: number;
  subproblemId?: string;
};

export async function postMasterMessage(input: MasterMessageInput) {
  const recipients = input.privateTo ?? input.addressedTo;
  const [row] = await db
    .insert(message)
    .values({
      spaceId: input.spaceId,
      authorParticipantId: null,
      kind: input.kind ?? "message",
      content: input.text,
      replyTo: input.replyTo,
      visibility: input.privateTo ? "private" : "all",
      addressedTo: recipients && recipients.length > 0 ? recipients : null,
    })
    .returning();
  if (input.subproblemId) {
    await setMessageMeta(input.spaceId, row.id, {
      subproblemId: input.subproblemId,
    });
  } else {
    await tagWithCurrentStep(input.spaceId, row.id);
  }
  const verb =
    row.kind === "question"
      ? "asked"
      : row.kind === "proposal"
        ? "proposed"
        : row.kind === "decision"
          ? "decided"
          : "said";
  await recordActivity(db, {
    spaceId: input.spaceId,
    actorParticipantId: null,
    type: "message",
    refId: row.id,
    summary: input.privateTo
      ? "The Master sent a private message"
      : `The Master ${verb}: ${truncate(input.text)}`,
  });
  return row;
}

export function ask(input: {
  spaceId: string;
  question: string;
  participantIds?: string[];
}) {
  return postMasterMessage({
    spaceId: input.spaceId,
    text: input.question,
    kind: "question",
    addressedTo: input.participantIds,
  });
}

export function propose(input: {
  spaceId: string;
  proposal: string;
  replyTo?: number;
}) {
  return postMasterMessage({
    spaceId: input.spaceId,
    text: input.proposal,
    kind: "proposal",
    replyTo: input.replyTo,
  });
}

export async function recordDecision(input: {
  spaceId: string;
  title: string;
  content: string;
  subproblemId?: string;
}) {
  const row = await postMasterMessage({
    spaceId: input.spaceId,
    text: `${input.title} decided: ${input.content}`,
    kind: "decision",
    subproblemId: input.subproblemId,
  });
  await pin({
    spaceId: input.spaceId,
    title: input.title,
    content: input.content,
  });
  return row;
}

export async function updateNotes(spaceId: string, content: string) {
  const [existing] = await db
    .select()
    .from(boardItem)
    .where(
      and(
        eq(boardItem.spaceId, spaceId),
        eq(boardItem.kind, "note"),
        isNull(boardItem.removedAt),
      ),
    );
  if (existing) {
    await db
      .update(boardItem)
      .set({ content })
      .where(eq(boardItem.id, existing.id));
    return existing.id;
  }
  const id = randomUUID();
  await db.insert(boardItem).values({ id, spaceId, kind: "note", content });
  return id;
}

export async function pin(input: {
  spaceId: string;
  title: string;
  content: string;
}) {
  const id = randomUUID();
  const existing = await db
    .select({ id: boardItem.id })
    .from(boardItem)
    .where(
      and(eq(boardItem.spaceId, input.spaceId), eq(boardItem.kind, "pin")),
    );
  await db.insert(boardItem).values({
    id,
    spaceId: input.spaceId,
    kind: "pin",
    title: input.title,
    content: input.content,
    position: existing.length,
  });
  return id;
}

export async function updatePin(
  spaceId: string,
  itemId: string,
  patch: { title?: string; content?: string },
) {
  const rows = await db
    .update(boardItem)
    .set(patch)
    .where(
      and(
        eq(boardItem.id, itemId),
        eq(boardItem.spaceId, spaceId),
        eq(boardItem.kind, "pin"),
        isNull(boardItem.removedAt),
      ),
    )
    .returning({ id: boardItem.id });
  if (rows.length === 0) throw new Error(`Pin ${itemId} not found.`);
}

export async function unpin(spaceId: string, itemId: string) {
  await db
    .update(boardItem)
    .set({ removedAt: new Date() })
    .where(and(eq(boardItem.id, itemId), eq(boardItem.spaceId, spaceId)));
}

export function closeSpaceAsMaster(spaceId: string, summary: string) {
  return closeSpace({ spaceId, actorParticipantId: null, summary });
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

// Participant text goes inside <message> and <item> tags. Escape it, so a
// participant can't close the tag and forge a message from the Master.
function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type MessageRow = typeof message.$inferSelect;
type ParticipantRow = typeof participant.$inferSelect;

export async function spaceParticipantsById(spaceId: string) {
  const people = await db
    .select()
    .from(participant)
    .where(eq(participant.spaceId, spaceId));
  return new Map(people.map((p) => [p.id, p]));
}

// The signed form the Master reads messages in, in its events, snapshot and
// read tools alike.
export function signMessages(
  messages: MessageRow[],
  byId: Map<string, ParticipantRow>,
) {
  return messages
    .map((m) => {
      const author = m.authorParticipantId
        ? byId.get(m.authorParticipantId)
        : null;
      const attrs = [
        `id="${m.id}"`,
        `from="${m.kind === "system" ? "system" : author ? `participant:${author.id}` : "master"}"`,
        author ? `represents="${escapeAttr(author.represents)}"` : null,
        `kind="${m.kind}"`,
        m.replyTo ? `reply_to="${m.replyTo}"` : null,
        m.visibility === "private" ? `private="true"` : null,
        m.addressedTo?.length
          ? `addressed_to="${m.addressedTo.join(",")}"`
          : null,
        `at="${m.createdAt.toISOString()}"`,
        m.via === "dashboard" ? `via="dashboard"` : null,
      ]
        .filter(Boolean)
        .join(" ");
      return `<message ${attrs}>\n${escapeText(m.content)}\n</message>`;
    })
    .join("\n");
}

export async function getMasterContext(spaceId: string, afterMessageId = 0) {
  const row = await getSpaceOrThrow(spaceId);
  const byId = await spaceParticipantsById(spaceId);
  const people = [...byId.values()];

  const messages = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), gt(message.id, afterMessageId)))
    .orderBy(asc(message.id));

  const transcript = signMessages(messages, byId);

  const items = await db
    .select()
    .from(boxItem)
    .where(and(eq(boxItem.spaceId, spaceId), isNull(boxItem.retractedAt)))
    .orderBy(asc(boxItem.createdAt));
  const boxes = people
    .filter((p) => !p.leftAt)
    .map((p) => {
      const entries = items
        .filter((item) => item.participantId === p.id)
        .map(
          (item) =>
            `  <item id="${item.id}" topic="${escapeAttr(item.topic)}">${escapeText(item.content)}</item>`,
        )
        .join("\n");
      return `<box participant="participant:${p.id}" represents="${escapeAttr(p.represents)}">\n${entries}\n</box>`;
    })
    .join("\n");

  const proposals = messages.filter((m) => m.kind === "proposal");
  const tallies = await Promise.all(
    proposals.map(async (p) => ({
      proposal_id: p.id,
      ...(await voteTally(p.id)),
    })),
  );

  return {
    space: row,
    participants: await listParticipants(spaceId),
    transcript,
    boxes,
    tallies,
    lastMessageId: messages.at(-1)?.id ?? afterMessageId,
  };
}

export async function getActivitySince(
  spaceId: string,
  afterId = 0,
  limit = 100,
) {
  return db
    .select()
    .from(activity)
    .where(and(eq(activity.spaceId, spaceId), gt(activity.id, afterId)))
    .orderBy(asc(activity.id))
    .limit(limit);
}

export async function getBoard(spaceId: string) {
  return db
    .select()
    .from(boardItem)
    .where(and(eq(boardItem.spaceId, spaceId), isNull(boardItem.removedAt)))
    .orderBy(asc(boardItem.kind), asc(boardItem.position));
}
