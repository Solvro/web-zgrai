import { randomUUID } from "node:crypto";
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  max,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { tagWithCurrentStep } from "@/lib/master/meta";
import { newSubproblems } from "@/lib/master/plan";
import {
  activity,
  boardItem,
  boxItem,
  message,
  participant,
  proposalVote,
  space,
  spaceInvite,
  spacePlan,
  user,
} from "@/db/schema";
import {
  buildInviteMessage,
  generateInviteCode,
  hashInviteCode,
} from "./invite";
import { type MasterTrigger, notifyMaster } from "./master-hook";
import { appOrigin, dashboardUrl, sessionUrl } from "./urls";

export type Participant = typeof participant.$inferSelect;
export type Space = typeof space.$inferSelect;
export type Message = typeof message.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export class SpaceError extends Error {}

// Harness of an initiator who started the space on the dashboard and whose
// own agent hasn't joined yet.
export const DASHBOARD_HARNESS = "dashboard";

const PAGE_SIZE = 50;

export function truncate(text: string, length = 120) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
}

export async function recordActivity(
  executor: Executor,
  entry: {
    spaceId: string;
    actorParticipantId: string | null;
    type: (typeof activity.$inferInsert)["type"];
    summary: string;
    refId?: string | number | null;
    visibility?: "all" | "private";
  },
) {
  await executor.insert(activity).values({
    spaceId: entry.spaceId,
    actorParticipantId: entry.actorParticipantId,
    type: entry.type,
    summary: entry.summary,
    refId: entry.refId == null ? null : String(entry.refId),
    visibility: entry.visibility ?? "all",
  });
}

async function postSystemMessage(
  executor: Executor,
  spaceId: string,
  content: string,
) {
  const [row] = await executor
    .insert(message)
    .values({ spaceId, kind: "system", content })
    .returning();
  return row;
}

function trigger(spaceId: string, reason: MasterTrigger) {
  notifyMaster(spaceId, reason);
}

export async function getSpaceOrThrow(spaceId: string) {
  const [row] = await db.select().from(space).where(eq(space.id, spaceId));
  if (!row) throw new SpaceError(`Space ${spaceId} not found.`);
  return row;
}

export async function getParticipantOrThrow(spaceId: string, userId: string) {
  const [row] = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.spaceId, spaceId),
        eq(participant.userId, userId),
        isNull(participant.leftAt),
      ),
    );
  if (!row) {
    throw new SpaceError(
      `You are not a participant of space ${spaceId}. Join it first with join_space.`,
    );
  }
  await db
    .update(participant)
    .set({ lastSeenAt: new Date() })
    .where(eq(participant.id, row.id));
  return row;
}

async function requireOpenSpace(spaceId: string) {
  const row = await getSpaceOrThrow(spaceId);
  if (row.status !== "open") {
    throw new SpaceError(`Space "${row.title}" is ${row.status}.`);
  }
  return row;
}

async function requireInitiator(spaceId: string, userId: string) {
  const me = await getParticipantOrThrow(spaceId, userId);
  if (me.role !== "initiator") {
    throw new SpaceError("Only the initiator of the space can do this.");
  }
  return me;
}

async function insertInvite(
  executor: Executor,
  spaceId: string,
  options: { expiresInHours?: number; maxUses?: number } = {},
) {
  const code = generateInviteCode();
  await executor.insert(spaceInvite).values({
    id: randomUUID(),
    spaceId,
    codeHash: hashInviteCode(code),
    expiresAt: options.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 3_600_000)
      : null,
    maxUses: options.maxUses ?? null,
  });
  return code;
}

function invitePayload(row: Space, code: string) {
  return {
    invite_code: code,
    invite_message: buildInviteMessage({ origin: appOrigin, code }),
    session_url: sessionUrl(code),
    dashboard_url: dashboardUrl(row.id),
  };
}

export async function createSpace(input: {
  userId: string;
  title: string;
  goal: string;
  description?: string;
  deadline?: Date;
  represents?: string;
  harness?: string;
  steps?: string[];
  constraints?: string[];
  criteria?: string[];
}) {
  const [owner] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, input.userId));
  const represents = input.represents ?? owner?.name ?? "Initiator";

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(space)
      .values({
        id: randomUUID(),
        title: input.title,
        goal: input.goal,
        description: input.description,
        deadline: input.deadline,
        status: "open",
        createdBy: input.userId,
      })
      .returning();
    const [me] = await tx
      .insert(participant)
      .values({
        id: randomUUID(),
        spaceId: created.id,
        userId: input.userId,
        represents,
        role: "initiator",
        harness: input.harness,
      })
      .returning();
    if (
      input.steps?.length ||
      input.constraints?.length ||
      input.criteria?.length
    ) {
      await tx.insert(spacePlan).values({
        spaceId: created.id,
        subproblems: newSubproblems(input.steps ?? []),
        constraints: input.constraints ?? [],
        criteria: (input.criteria ?? []).map((text) => ({
          id: randomUUID(),
          text,
          met: false,
        })),
      });
    }
    const code = await insertInvite(tx, created.id);
    await postSystemMessage(
      tx,
      created.id,
      `${represents} created the space. Goal: ${created.goal}`,
    );
    await recordActivity(tx, {
      spaceId: created.id,
      actorParticipantId: me.id,
      type: "created",
      summary: `${represents} created the space "${created.title}"`,
    });
    return { space: created, participant: me, code };
  });

  trigger(result.space.id, "created");
  return {
    space: result.space,
    participant: result.participant,
    ...invitePayload(result.space, result.code),
  };
}

export async function createInvite(input: {
  spaceId: string;
  userId: string;
  expiresInHours?: number;
  maxUses?: number;
}) {
  await requireInitiator(input.spaceId, input.userId);
  const row = await requireOpenSpace(input.spaceId);
  const code = await insertInvite(db, input.spaceId, input);
  return invitePayload(row, code);
}

export async function revokeInvite(input: {
  spaceId: string;
  userId: string;
  inviteCode: string;
}) {
  await requireInitiator(input.spaceId, input.userId);
  const revoked = await db
    .update(spaceInvite)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(spaceInvite.spaceId, input.spaceId),
        eq(spaceInvite.codeHash, hashInviteCode(input.inviteCode)),
      ),
    )
    .returning({ id: spaceInvite.id });
  if (revoked.length === 0) throw new SpaceError("Invite code not found.");
}

export async function joinSpace(input: {
  userId: string;
  inviteCode: string;
  represents: string;
  intro?: string;
  harness?: string;
}) {
  const [invite] = await db
    .select()
    .from(spaceInvite)
    .where(eq(spaceInvite.codeHash, hashInviteCode(input.inviteCode)));
  if (!invite || invite.revokedAt) {
    throw new SpaceError("This invite code is not valid.");
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new SpaceError("This invite code has expired.");
  }
  const target = await requireOpenSpace(invite.spaceId);

  const [existing] = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.spaceId, target.id),
        eq(participant.userId, input.userId),
      ),
    );
  const agentless = existing?.harness === DASHBOARD_HARNESS;
  if (existing && !existing.leftAt && !agentless) {
    return { space: target, participant: existing, alreadyJoined: true };
  }
  if (invite.maxUses != null && invite.uses >= invite.maxUses) {
    throw new SpaceError("This invite code has been used up.");
  }

  const joined = await db.transaction(async (tx) => {
    let me: Participant;
    if (existing) {
      [me] = await tx
        .update(participant)
        .set({
          leftAt: null,
          represents: input.represents,
          harness: input.harness ?? (agentless ? "agent" : existing.harness),
          lastSeenAt: new Date(),
        })
        .where(eq(participant.id, existing.id))
        .returning();
    } else {
      [me] = await tx
        .insert(participant)
        .values({
          id: randomUUID(),
          spaceId: target.id,
          userId: input.userId,
          represents: input.represents,
          harness: input.harness,
        })
        .returning();
    }
    await tx
      .update(spaceInvite)
      .set({ uses: sql`${spaceInvite.uses} + 1` })
      .where(eq(spaceInvite.id, invite.id));
    const via = me.harness ? ` (${me.harness})` : "";
    await postSystemMessage(
      tx,
      target.id,
      `${me.represents}'s agent${via} joined the space.`,
    );
    if (input.intro) {
      await tx.insert(message).values({
        spaceId: target.id,
        authorParticipantId: me.id,
        content: input.intro,
      });
    }
    await recordActivity(tx, {
      spaceId: target.id,
      actorParticipantId: me.id,
      type: "joined",
      summary: `${me.represents}'s agent${via} joined`,
    });
    return me;
  });

  trigger(target.id, "joined");
  return { space: target, participant: joined, alreadyJoined: false };
}

export function visibleTo(participantId: string) {
  return or(
    eq(message.visibility, "all"),
    eq(message.authorParticipantId, participantId),
    arrayContains(message.addressedTo, [participantId]),
  );
}

async function participantsById(spaceIds: string[]) {
  if (spaceIds.length === 0) return new Map<string, Participant>();
  const rows = await db
    .select()
    .from(participant)
    .where(inArray(participant.spaceId, spaceIds));
  return new Map(rows.map((row) => [row.id, row]));
}

export type AgentMessage = {
  id: number;
  space_id: string;
  from: string;
  from_participant_id: string | null;
  kind: Message["kind"];
  text: string;
  reply_to: number | null;
  private: boolean;
  addressed_to_you: boolean;
  created_at: string;
};

function formatForAgent(
  row: Message,
  people: Map<string, Participant>,
  viewerId: string,
): AgentMessage {
  const author = row.authorParticipantId
    ? people.get(row.authorParticipantId)
    : undefined;
  return {
    id: row.id,
    space_id: row.spaceId,
    from:
      row.kind === "system"
        ? "System"
        : author
          ? author.id === viewerId
            ? `${author.represents} (you)`
            : author.represents
          : "Master",
    from_participant_id: row.authorParticipantId,
    kind: row.kind,
    text: row.content,
    reply_to: row.replyTo,
    private: row.visibility === "private",
    addressed_to_you: row.addressedTo?.includes(viewerId) ?? false,
    created_at: row.createdAt.toISOString(),
  };
}

async function latestMessageId(spaceId: string) {
  const [row] = await db
    .select({ id: max(message.id) })
    .from(message)
    .where(eq(message.spaceId, spaceId));
  return row?.id ?? 0;
}

export async function recentMessages(me: Participant, limit = 20) {
  const rows = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, me.spaceId), visibleTo(me.id)))
    .orderBy(desc(message.id))
    .limit(limit);
  const people = await participantsById([me.spaceId]);
  return rows.reverse().map((row) => formatForAgent(row, people, me.id));
}

export async function listParticipants(spaceId: string) {
  return db
    .select({
      participant_id: participant.id,
      represents: participant.represents,
      role: participant.role,
      harness: participant.harness,
      last_seen_at: participant.lastSeenAt,
    })
    .from(participant)
    .where(and(eq(participant.spaceId, spaceId), isNull(participant.leftAt)))
    .orderBy(asc(participant.joinedAt));
}

export async function joinedSpaceSnapshot(me: Participant) {
  const target = await getSpaceOrThrow(me.spaceId);
  return {
    space_id: target.id,
    participant_id: me.id,
    title: target.title,
    goal: target.goal,
    description: target.description,
    participants: await listParticipants(target.id),
    recent_messages: await recentMessages(me),
    cursor: await latestMessageId(target.id),
    dashboard_url: dashboardUrl(target.id),
  };
}

async function pendingQuestions(me: Participant) {
  const myReplies = db
    .select({ replyTo: message.replyTo })
    .from(message)
    .where(
      and(
        eq(message.spaceId, me.spaceId),
        eq(message.authorParticipantId, me.id),
        sql`${message.replyTo} is not null`,
      ),
    );
  const rows = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, me.spaceId),
        eq(message.kind, "question"),
        visibleTo(me.id),
        or(
          isNull(message.addressedTo),
          arrayContains(message.addressedTo, [me.id]),
        ),
        notInArray(message.id, myReplies),
        sql`${message.authorParticipantId} is distinct from ${me.id}`,
      ),
    )
    .orderBy(asc(message.id))
    .limit(10);
  const people = await participantsById([me.spaceId]);
  return rows.map((row) => formatForAgent(row, people, me.id));
}

async function openProposals(spaceId: string) {
  const proposals = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), eq(message.kind, "proposal")))
    .orderBy(desc(message.id))
    .limit(10);
  return Promise.all(
    proposals.map(async (row) => ({
      proposal_id: row.id,
      text: row.content,
      tally: await voteTally(row.id),
    })),
  );
}

export async function listMySpaces(userId: string) {
  const mine = await db
    .select({ participant, space })
    .from(participant)
    .innerJoin(space, eq(space.id, participant.spaceId))
    .where(and(eq(participant.userId, userId), isNull(participant.leftAt)))
    .orderBy(desc(space.createdAt));

  return Promise.all(
    mine.map(async ({ participant: me, space: row }) => {
      const [unread] = await db
        .select({ count: count() })
        .from(message)
        .where(
          and(
            eq(message.spaceId, row.id),
            visibleTo(me.id),
            gt(message.id, me.lastReadMessageId ?? 0),
          ),
        );
      return {
        space_id: row.id,
        title: row.title,
        goal: row.goal,
        status: row.status,
        role: me.role,
        represents: me.represents,
        unread: unread?.count ?? 0,
        pending_questions: (await pendingQuestions(me)).length,
        dashboard_url: dashboardUrl(row.id),
      };
    }),
  );
}

export async function getSpaceDetails(spaceId: string, userId: string) {
  const me = await getParticipantOrThrow(spaceId, userId);
  const row = await getSpaceOrThrow(spaceId);
  const decisions = await db
    .select({
      id: message.id,
      text: message.content,
      created_at: message.createdAt,
    })
    .from(message)
    .where(and(eq(message.spaceId, spaceId), eq(message.kind, "decision")))
    .orderBy(asc(message.id));
  const pins = await db
    .select({ title: boardItem.title, content: boardItem.content })
    .from(boardItem)
    .where(
      and(
        eq(boardItem.spaceId, spaceId),
        eq(boardItem.kind, "pin"),
        isNull(boardItem.removedAt),
      ),
    )
    .orderBy(asc(boardItem.position));
  return {
    space_id: row.id,
    title: row.title,
    goal: row.goal,
    description: row.description,
    status: row.status,
    deadline: row.deadline,
    summary: row.summary,
    you: { participant_id: me.id, represents: me.represents, role: me.role },
    participants: await listParticipants(spaceId),
    pins,
    decisions,
    open_proposals: await openProposals(spaceId),
    pending_questions: await pendingQuestions(me),
    dashboard_url: dashboardUrl(spaceId),
  };
}

export async function sendMessage(input: {
  spaceId: string;
  userId: string;
  text: string;
  replyTo?: number;
  privateToMaster?: boolean;
}) {
  await requireOpenSpace(input.spaceId);
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  const visibility = input.privateToMaster ? "private" : "all";
  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(message)
      .values({
        spaceId: input.spaceId,
        authorParticipantId: me.id,
        content: input.text,
        replyTo: input.replyTo,
        visibility,
      })
      .returning();
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: me.id,
      type: "message",
      refId: created.id,
      summary: input.privateToMaster
        ? `${me.represents} sent a private note to the Master`
        : `${me.represents}: ${truncate(input.text)}`,
    });
    return created;
  });
  await tagWithCurrentStep(input.spaceId, row.id);
  trigger(input.spaceId, "message");
  return row;
}

async function activeParticipants(userId: string, spaceId?: string) {
  const rows = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.userId, userId),
        isNull(participant.leftAt),
        spaceId ? eq(participant.spaceId, spaceId) : undefined,
      ),
    );
  if (spaceId && rows.length === 0) {
    throw new SpaceError(
      `You are not a participant of space ${spaceId}. Join it first with join_space.`,
    );
  }
  return rows;
}

export async function getUpdates(input: {
  userId: string;
  spaceId?: string;
  cursor?: number;
}) {
  const mine = await activeParticipants(input.userId, input.spaceId);
  if (mine.length === 0) {
    return {
      messages: [],
      pending_questions: [],
      cursor: input.cursor ?? 0,
      has_more: false,
    };
  }
  const people = await participantsById(mine.map((p) => p.spaceId));
  const collected: AgentMessage[] = [];
  let hasMore = false;

  for (const me of mine) {
    const after = input.cursor ?? me.lastReadMessageId ?? 0;
    const rows = await db
      .select()
      .from(message)
      .where(
        and(
          eq(message.spaceId, me.spaceId),
          visibleTo(me.id),
          gt(message.id, after),
        ),
      )
      .orderBy(asc(message.id))
      .limit(PAGE_SIZE + 1);
    if (rows.length > PAGE_SIZE) hasMore = true;
    const page = rows.slice(0, PAGE_SIZE);
    collected.push(...page.map((row) => formatForAgent(row, people, me.id)));
    const last = page.at(-1)?.id;
    await db
      .update(participant)
      .set({
        lastSeenAt: new Date(),
        ...(last && last > (me.lastReadMessageId ?? 0)
          ? { lastReadMessageId: last }
          : {}),
      })
      .where(eq(participant.id, me.id));
  }

  collected.sort((a, b) => a.id - b.id);
  const pending = (
    await Promise.all(mine.map((me) => pendingQuestions(me)))
  ).flat();
  const highest = collected.at(-1)?.id;
  return {
    messages: collected,
    pending_questions: pending,
    cursor: Math.max(
      highest ?? 0,
      input.cursor ?? 0,
      ...mine.map((m) => m.lastReadMessageId ?? 0),
    ),
    has_more: hasMore,
  };
}

export async function waitForUpdates(input: {
  userId: string;
  spaceId?: string;
  cursor?: number;
  timeoutSeconds: number;
  signal?: AbortSignal;
}) {
  const deadline = Date.now() + input.timeoutSeconds * 1000;
  for (;;) {
    const updates = await getUpdates(input);
    if (updates.messages.length > 0) return { ...updates, timed_out: false };
    if (Date.now() >= deadline || input.signal?.aborted) {
      return { ...updates, timed_out: true };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export async function getHistory(input: {
  spaceId: string;
  userId: string;
  before?: number;
  limit?: number;
}) {
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  const limit = Math.min(input.limit ?? PAGE_SIZE, 100);
  const rows = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, input.spaceId),
        visibleTo(me.id),
        input.before ? lt(message.id, input.before) : undefined,
      ),
    )
    .orderBy(desc(message.id))
    .limit(limit + 1);
  const people = await participantsById([input.spaceId]);
  const page = rows.slice(0, limit).reverse();
  return {
    messages: page.map((row) => formatForAgent(row, people, me.id)),
    has_more: rows.length > limit,
    before: page[0]?.id ?? null,
  };
}

export async function shareContext(input: {
  spaceId: string;
  userId: string;
  topic: string;
  content: string;
}) {
  await requireOpenSpace(input.spaceId);
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(boxItem).values({
      id,
      spaceId: input.spaceId,
      participantId: me.id,
      topic: input.topic,
      content: input.content,
    });
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: me.id,
      type: "shared_context",
      refId: id,
      summary: `${me.represents} shared ${input.topic}`,
    });
  });
  trigger(input.spaceId, "shared_context");
  return { item_id: id };
}

export async function getMyBox(spaceId: string, userId: string) {
  const me = await getParticipantOrThrow(spaceId, userId);
  return db
    .select({
      item_id: boxItem.id,
      topic: boxItem.topic,
      content: boxItem.content,
      created_at: boxItem.createdAt,
    })
    .from(boxItem)
    .where(and(eq(boxItem.participantId, me.id), isNull(boxItem.retractedAt)))
    .orderBy(asc(boxItem.createdAt));
}

export async function retractContext(input: {
  spaceId: string;
  userId: string;
  itemId: string;
}) {
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  const [item] = await db
    .update(boxItem)
    .set({ retractedAt: new Date() })
    .where(
      and(
        eq(boxItem.id, input.itemId),
        eq(boxItem.participantId, me.id),
        isNull(boxItem.retractedAt),
      ),
    )
    .returning();
  if (!item) throw new SpaceError("Box item not found.");
  await recordActivity(db, {
    spaceId: input.spaceId,
    actorParticipantId: me.id,
    type: "retracted_context",
    refId: item.id,
    summary: `${me.represents} withdrew ${item.topic}`,
  });
  trigger(input.spaceId, "retracted_context");
}

export async function voteTally(proposalId: number) {
  const rows = await db
    .select({ choice: proposalVote.choice, count: count() })
    .from(proposalVote)
    .where(eq(proposalVote.proposalMessageId, proposalId))
    .groupBy(proposalVote.choice);
  const tally = { yes: 0, no: 0, abstain: 0 };
  for (const row of rows) tally[row.choice] = row.count;
  return tally;
}

export async function vote(input: {
  spaceId: string;
  userId: string;
  proposalId: number;
  choice: "yes" | "no" | "abstain";
  comment?: string;
}) {
  await requireOpenSpace(input.spaceId);
  const me = await getParticipantOrThrow(input.spaceId, input.userId);
  const [proposal] = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.id, input.proposalId),
        eq(message.spaceId, input.spaceId),
        eq(message.kind, "proposal"),
      ),
    );
  if (!proposal)
    throw new SpaceError(`Proposal ${input.proposalId} not found.`);
  await db
    .insert(proposalVote)
    .values({
      proposalMessageId: proposal.id,
      participantId: me.id,
      choice: input.choice,
      comment: input.comment,
    })
    .onConflictDoUpdate({
      target: [proposalVote.proposalMessageId, proposalVote.participantId],
      set: {
        choice: input.choice,
        comment: input.comment,
        createdAt: new Date(),
      },
    });
  await recordActivity(db, {
    spaceId: input.spaceId,
    actorParticipantId: me.id,
    type: "vote",
    refId: proposal.id,
    summary: `${me.represents} voted ${input.choice} on "${truncate(proposal.content, 60)}"`,
  });
  trigger(input.spaceId, "vote");
  return voteTally(proposal.id);
}

async function markLeft(
  me: Participant,
  type: "left" | "removed",
  text: string,
) {
  await db.transaction(async (tx) => {
    await tx
      .update(participant)
      .set({ leftAt: new Date() })
      .where(eq(participant.id, me.id));
    await postSystemMessage(tx, me.spaceId, text);
    await recordActivity(tx, {
      spaceId: me.spaceId,
      actorParticipantId: me.id,
      type,
      summary: text,
    });
  });
  trigger(me.spaceId, "left");
}

export async function leaveSpace(spaceId: string, userId: string) {
  const me = await getParticipantOrThrow(spaceId, userId);
  if (me.role === "initiator") {
    throw new SpaceError("The initiator can't leave. Close the space instead.");
  }
  await markLeft(me, "left", `${me.represents}'s agent left the space.`);
}

export async function removeParticipant(input: {
  spaceId: string;
  userId: string;
  participantId: string;
}) {
  await requireInitiator(input.spaceId, input.userId);
  const [target] = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.id, input.participantId),
        eq(participant.spaceId, input.spaceId),
        isNull(participant.leftAt),
      ),
    );
  if (!target) throw new SpaceError("Participant not found.");
  if (target.role === "initiator") {
    throw new SpaceError("The initiator can't be removed.");
  }
  await markLeft(
    target,
    "removed",
    `${target.represents} was removed from the space.`,
  );
}

export async function updateGoal(input: {
  spaceId: string;
  userId: string;
  goal: string;
}) {
  const me = await requireInitiator(input.spaceId, input.userId);
  await requireOpenSpace(input.spaceId);
  await db.transaction(async (tx) => {
    await tx
      .update(space)
      .set({ goal: input.goal })
      .where(eq(space.id, input.spaceId));
    await postSystemMessage(
      tx,
      input.spaceId,
      `The goal changed to: ${input.goal}`,
    );
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: me.id,
      type: "goal_updated",
      summary: `${me.represents} changed the goal: ${truncate(input.goal)}`,
    });
  });
  trigger(input.spaceId, "goal_updated");
}

export async function closeSpace(input: {
  spaceId: string;
  actorParticipantId: string | null;
  summary?: string;
}) {
  const row = await requireOpenSpace(input.spaceId);
  await db.transaction(async (tx) => {
    await tx
      .update(space)
      .set({
        status: "closed",
        closedAt: new Date(),
        summary: input.summary ?? row.summary,
      })
      .where(eq(space.id, input.spaceId));
    await postSystemMessage(
      tx,
      input.spaceId,
      input.summary
        ? `The space is closed. Summary: ${input.summary}`
        : "The space is closed.",
    );
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: input.actorParticipantId,
      type: "closed",
      summary: "The space was closed",
    });
  });
}

export async function closeSpaceAsInitiator(input: {
  spaceId: string;
  userId: string;
  summary?: string;
}) {
  const me = await requireInitiator(input.spaceId, input.userId);
  await closeSpace({
    spaceId: input.spaceId,
    actorParticipantId: me.id,
    summary: input.summary,
  });
}

export async function touchParticipant(participantId: string) {
  await db
    .update(participant)
    .set({ lastSeenAt: new Date() })
    .where(eq(participant.id, participantId));
}

export async function getParticipantById(participantId: string) {
  const [row] = await db
    .select()
    .from(participant)
    .where(and(eq(participant.id, participantId), isNull(participant.leftAt)));
  return row ?? null;
}

export async function getActiveParticipant(spaceId: string, userId: string) {
  const [row] = await db
    .select()
    .from(participant)
    .where(
      and(
        eq(participant.spaceId, spaceId),
        eq(participant.userId, userId),
        isNull(participant.leftAt),
      ),
    );
  return row ?? null;
}

export async function peekMessages(me: Participant, afterId: number) {
  const rows = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, me.spaceId),
        visibleTo(me.id),
        gt(message.id, afterId),
      ),
    )
    .orderBy(asc(message.id))
    .limit(PAGE_SIZE);
  const people = await participantsById([me.spaceId]);
  return rows.map((row) => formatForAgent(row, people, me.id));
}

export { latestMessageId };
