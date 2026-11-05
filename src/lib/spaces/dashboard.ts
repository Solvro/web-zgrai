import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { db } from "@/db";
import {
  masterMessageMeta,
  message,
  participant,
  space,
  spaceInvite,
  spacePlan,
} from "@/db/schema";
import type {
  PresenceStatus,
  ProblemSummary,
  SessionView,
  ViewMessage,
  ViewPerson,
  ViewStep,
} from "@/lib/dashboard/view";
import { agentColor } from "@/lib/dashboard/view";
import { isMasterPaused } from "@/lib/master/budget";
import { finalPlanApproval } from "@/lib/master/final-plan";
import { messageMetaById, tagWithCurrentStep } from "@/lib/master/meta";
import { currentStep, getPlan, type Plan } from "@/lib/master/plan";
import { hashInviteCode } from "./invite";
import { notifyMaster } from "./master-hook";
import {
  DASHBOARD_HARNESS,
  getActiveParticipant,
  getSpaceOrThrow,
  type Message,
  type Participant,
  recordActivity,
  SpaceError,
  truncate,
  visibleTo,
  voteTally,
} from "./service";

// Read models for the dashboard. They read with getActiveParticipant, which
// doesn't touch last_seen_at, so presence keeps meaning "the agent is around".

const ONLINE_MS = 3 * 60_000;
const INITIAL_MESSAGES = 200;
const PAGE_MESSAGES = 100;

function byJoinOrder(rows: Participant[]) {
  return [...rows].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
}

function presence(p: Participant, now: number): PresenceStatus {
  if (p.harness === DASHBOARD_HARNESS) return "no-agent";
  return now - p.lastSeenAt.getTime() < ONLINE_MS ? "online" : "dozing";
}

function viewPeople(rows: Participant[], meId: string): ViewPerson[] {
  const now = Date.now();
  return byJoinOrder(rows).map((p, index) => ({
    id: p.id,
    name: p.represents,
    role: p.role,
    color: agentColor(index),
    status: presence(p, now),
    harness: p.harness === DASHBOARD_HARNESS ? null : p.harness,
    isMe: p.id === meId,
    left: p.leftAt != null,
  }));
}

// A participant's latest public message on each step stands in for an opinion
// the Master hasn't recorded yet.
async function latestAnswers(spaceId: string) {
  const rows = await db
    .selectDistinctOn(
      [masterMessageMeta.subproblemId, message.authorParticipantId],
      {
        stepId: masterMessageMeta.subproblemId,
        participantId: message.authorParticipantId,
        content: message.content,
      },
    )
    .from(message)
    .innerJoin(masterMessageMeta, eq(masterMessageMeta.messageId, message.id))
    .where(
      and(
        eq(message.spaceId, spaceId),
        eq(message.kind, "message"),
        eq(message.visibility, "all"),
        isNull(message.via),
        isNotNull(masterMessageMeta.subproblemId),
        isNotNull(message.authorParticipantId),
      ),
    )
    .orderBy(
      masterMessageMeta.subproblemId,
      message.authorParticipantId,
      desc(message.id),
    );
  return new Map(
    rows.map((r) => [
      `${r.stepId}:${r.participantId}`,
      truncate(r.content, 90),
    ]),
  );
}

function viewSteps(
  plan: Plan,
  people: ViewPerson[],
  answers: Map<string, string>,
): ViewStep[] {
  const present = people.filter((p) => !p.left);
  return plan.subproblems.map((s) => ({
    id: s.id,
    title: s.title,
    status:
      s.status === "decided"
        ? "done"
        : s.status === "discussing" || s.status === "conflict"
          ? "now"
          : "next",
    conflict: s.status === "conflict",
    decision: s.decision,
    opinions: present.flatMap((p) => {
      const text = s.opinions?.[p.id] ?? answers.get(`${s.id}:${p.id}`);
      return text ? [{ participantId: p.id, text }] : [];
    }),
  }));
}

async function viewMessages(rows: Message[]): Promise<ViewMessage[]> {
  const meta = await messageMetaById(rows.map((row) => row.id));
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      kind: row.kind,
      author:
        row.kind === "system"
          ? { type: "system" as const }
          : row.authorParticipantId
            ? {
                type: "participant" as const,
                participantId: row.authorParticipantId,
              }
            : { type: "master" as const },
      text: row.content,
      stepId: meta.get(row.id)?.subproblemId ?? null,
      withdrawn: meta.get(row.id)?.withdrawnAt != null,
      private: row.visibility === "private",
      viaDashboard: row.via === "dashboard",
      createdAt: row.createdAt.toISOString(),
      tally: row.kind === "proposal" ? await voteTally(row.id) : undefined,
    })),
  );
}

async function messagesFor(me: Participant, after: number) {
  if (after > 0) {
    return db
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
      .limit(PAGE_MESSAGES);
  }
  const rows = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, me.spaceId), visibleTo(me.id)))
    .orderBy(desc(message.id))
    .limit(INITIAL_MESSAGES);
  return rows.reverse();
}

async function viewFinalPlan(spaceId: string) {
  const approval = await finalPlanApproval(spaceId);
  if (!approval) return null;
  const ids = (list: { id: string }[]) => list.map((p) => p.id);
  return {
    proposalId: approval.proposal.id,
    text: approval.proposal.content,
    approvedBy: ids(approval.approvedBy),
    waitingFor: ids(approval.waitingFor),
    notApproving: ids(approval.notApproving),
  };
}

export async function getSessionView(
  spaceId: string,
  userId: string,
  after = 0,
): Promise<SessionView | null> {
  const me = await getActiveParticipant(spaceId, userId);
  if (!me) return null;
  const row = await getSpaceOrThrow(spaceId);
  const everyone = await db
    .select()
    .from(participant)
    .where(eq(participant.spaceId, spaceId));
  const people = viewPeople(everyone, me.id);
  const plan = await getPlan(spaceId);
  const rows = await messagesFor(me, after);

  return {
    space: {
      id: row.id,
      title: row.title,
      goal: row.goal,
      status: row.status,
      summary: row.summary,
    },
    me: { participantId: me.id, role: me.role },
    people,
    steps: viewSteps(plan, people, await latestAnswers(spaceId)),
    criteria: plan.criteria.map(({ id, text, met, evidence }) => ({
      id,
      text,
      met,
      evidence,
    })),
    finalPlan: await viewFinalPlan(spaceId),
    masterPaused: await isMasterPaused(spaceId),
    messages: await viewMessages(rows),
    cursor: rows.at(-1)?.id ?? after,
  };
}

export async function listProblems(userId: string): Promise<ProblemSummary[]> {
  const mine = await db
    .select({ participant, space })
    .from(participant)
    .innerJoin(space, eq(space.id, participant.spaceId))
    .where(and(eq(participant.userId, userId), isNull(participant.leftAt)))
    .orderBy(desc(space.createdAt));
  if (mine.length === 0) return [];

  const spaceIds = mine.map((m) => m.space.id);
  const everyone = await db
    .select()
    .from(participant)
    .where(inArray(participant.spaceId, spaceIds));
  const plans = await db
    .select()
    .from(spacePlan)
    .where(inArray(spacePlan.spaceId, spaceIds));
  const planOf = new Map(plans.map((p) => [p.spaceId, p]));

  return mine.map(({ participant: me, space: row }) => {
    const people = byJoinOrder(
      everyone.filter((p) => p.spaceId === row.id),
    ).map((p, index) => ({ p, color: agentColor(index) }));
    const present = people.filter(({ p }) => !p.leftAt);
    const initiator = people.find(({ p }) => p.role === "initiator")?.p;
    const steps = planOf.get(row.id)?.subproblems ?? [];
    const now = currentStep({ subproblems: steps });
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      role: me.role,
      initiatorName: initiator?.represents ?? "someone",
      bots: present.map(({ p, color }) => ({
        color,
        awake: p.harness !== DASHBOARD_HARNESS,
      })),
      stepsTotal: steps.length,
      stepsDone: steps.filter((s) => s.status === "decided").length,
      currentStep: now?.title ?? null,
      nextStep: steps.find((s) => s.status === "open")?.title ?? null,
      agentsJoined: present.filter(({ p }) => p.harness !== DASHBOARD_HARNESS)
        .length,
      closedAt: row.closedAt?.toISOString() ?? null,
    };
  });
}

export async function getSpaceTitle(spaceId: string, userId: string) {
  const me = await getActiveParticipant(spaceId, userId);
  if (!me) return null;
  const row = await getSpaceOrThrow(spaceId);
  return { title: row.title, role: me.role, status: row.status };
}

// The initiator writes to the Master on the dashboard. Everyone sees it, and
// the Master knows it came from the person, not from their agent.
export async function sendDashboardMessage(input: {
  spaceId: string;
  userId: string;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) throw new SpaceError("The message is empty.");
  const row = await getSpaceOrThrow(input.spaceId);
  if (row.status !== "open") {
    throw new SpaceError(`Space "${row.title}" is ${row.status}.`);
  }
  const me = await getActiveParticipant(input.spaceId, input.userId);
  if (!me || me.role !== "initiator") {
    throw new SpaceError("Only the admin can message the Master.");
  }
  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(message)
      .values({
        spaceId: input.spaceId,
        authorParticipantId: me.id,
        content: text,
        via: "dashboard",
      })
      .returning();
    await recordActivity(tx, {
      spaceId: input.spaceId,
      actorParticipantId: me.id,
      type: "message",
      refId: inserted.id,
      summary: `${me.represents} on the dashboard: ${truncate(text)}`,
    });
    return inserted;
  });
  await tagWithCurrentStep(input.spaceId, created.id);
  notifyMaster(input.spaceId, "message");
  return created;
}

export async function resolveInvite(code: string) {
  const [invite] = await db
    .select()
    .from(spaceInvite)
    .where(eq(spaceInvite.codeHash, hashInviteCode(code)));
  if (!invite || invite.revokedAt) return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;
  return invite;
}

// What the public session link shows before you join.
export async function getInvitePreview(spaceId: string) {
  const row = await getSpaceOrThrow(spaceId);
  const [initiator] = await db
    .select({ represents: participant.represents })
    .from(participant)
    .where(
      and(eq(participant.spaceId, spaceId), eq(participant.role, "initiator")),
    );
  return {
    title: row.title,
    goal: row.goal,
    status: row.status,
    initiatorName: initiator?.represents ?? "Someone",
  };
}
