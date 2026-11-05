import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { message, participant, space, user } from "@/db/schema";
import { notifyMaster } from "@/lib/spaces/master-hook";
import {
  createInvite,
  getParticipantOrThrow,
  getSpaceOrThrow,
  recordActivity,
  SpaceError,
  truncate,
} from "@/lib/spaces/service";
import { getPlan, setConstraints, setCriteria, setSubproblems } from "./plan";

// Stage 1: the initiator shapes the problem with the Master on the dashboard.
// A draft space has no invite and no other participants until it's confirmed.

async function requireDraft(spaceId: string) {
  const row = await getSpaceOrThrow(spaceId);
  if (row.status !== "draft")
    throw new SpaceError(`Space "${row.title}" is ${row.status}.`);
  return row;
}

async function requireDraftInitiator(spaceId: string, userId: string) {
  await requireDraft(spaceId);
  const me = await getParticipantOrThrow(spaceId, userId);
  if (me.role !== "initiator")
    throw new SpaceError("Only the initiator can shape the draft.");
  return me;
}

export async function createDraftSpace(input: {
  userId: string;
  description: string;
  represents?: string;
}) {
  const [owner] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, input.userId));
  const represents = input.represents ?? owner?.name ?? "Initiator";

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(space)
      .values({
        id: randomUUID(),
        title: truncate(input.description, 48),
        goal: "",
        description: input.description,
        status: "draft",
        createdBy: input.userId,
      })
      .returning();
    const [me] = await tx
      .insert(participant)
      .values({
        id: randomUUID(),
        spaceId: row.id,
        userId: input.userId,
        represents,
        role: "initiator",
        harness: "dashboard",
      })
      .returning();
    await tx.insert(message).values({
      spaceId: row.id,
      authorParticipantId: me.id,
      content: input.description,
    });
    await recordActivity(tx, {
      spaceId: row.id,
      actorParticipantId: me.id,
      type: "created",
      summary: `${represents} started shaping "${row.title}"`,
    });
    return row;
  });

  notifyMaster(created.id, "created");
  return created;
}

// The initiator's side of the shaping chat.
export async function sendDraftMessage(input: {
  spaceId: string;
  userId: string;
  text: string;
}) {
  const me = await requireDraftInitiator(input.spaceId, input.userId);
  const [row] = await db
    .insert(message)
    .values({
      spaceId: input.spaceId,
      authorParticipantId: me.id,
      content: input.text,
    })
    .returning();
  await recordActivity(db, {
    spaceId: input.spaceId,
    actorParticipantId: me.id,
    type: "message",
    refId: row.id,
    summary: `${me.represents}: ${truncate(input.text)}`,
  });
  notifyMaster(input.spaceId, "message");
  return row;
}

// The Master's update_draft tool, and the dashboard's draft editor.
export async function updateDraft(
  spaceId: string,
  patch: {
    title?: string;
    goal?: string;
    description?: string;
    deadline?: Date | null;
    subproblems?: string[];
    constraints?: string[];
    criteria?: string[];
  },
) {
  await requireDraft(spaceId);
  const { subproblems, constraints, criteria, ...fields } = patch;
  if (Object.keys(fields).length > 0) {
    await db.update(space).set(fields).where(eq(space.id, spaceId));
  }
  if (subproblems) await setSubproblems(spaceId, subproblems);
  if (constraints) await setConstraints(spaceId, constraints);
  if (criteria) await setCriteria(spaceId, criteria);
}

// The initiator confirms the draft: the space opens and gets its first invite.
export async function confirmDraft(input: { spaceId: string; userId: string }) {
  const me = await requireDraftInitiator(input.spaceId, input.userId);
  const row = await getSpaceOrThrow(input.spaceId);
  if (!row.goal.trim())
    throw new SpaceError("The draft needs a goal before it can open.");
  const plan = await getPlan(input.spaceId);
  if (plan.criteria.length === 0) {
    throw new SpaceError(
      "The draft needs success criteria before it can open. Ask the Master to define them.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(space)
      .set({ status: "open" })
      .where(eq(space.id, input.spaceId));
    await tx.insert(message).values({
      spaceId: input.spaceId,
      kind: "system",
      content: `${me.represents} opened the space. Goal: ${row.goal}`,
    });
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: me.id,
      type: "created",
      summary: `${me.represents} opened the space "${row.title}"`,
    });
  });

  const invite = await createInvite({
    spaceId: input.spaceId,
    userId: input.userId,
  });
  notifyMaster(input.spaceId, "opened");
  return invite;
}
