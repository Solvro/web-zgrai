import type {
  Activity,
  Actor,
  Participant,
  Space,
  Subproblem,
  ViewerRole,
} from "./types";

export function findParticipant(space: Space, id: string | undefined) {
  return space.participants.find((p) => p.id === id);
}

export function actorParticipant(space: Space, actor: Actor) {
  return actor.kind === "participant"
    ? findParticipant(space, actor.participantId)
    : undefined;
}

export function agentName(participant: Participant) {
  return `${participant.represents}'s agent`;
}

export function actorName(space: Space, actor: Actor) {
  if (actor.kind === "master") return "Master";
  if (actor.kind === "system") return "System";
  const participant = actorParticipant(space, actor);
  return participant ? agentName(participant) : "Unknown agent";
}

export type Presence = "online" | "idle" | "offline" | "left" | "removed";

// Agents poll the server, so "last seen" is a good enough presence signal.
export function presence(participant: Participant, at: number): Presence {
  if (participant.removedAt) return "removed";
  if (participant.leftAt) return "left";
  const idle = at - participant.lastSeenAt;
  if (idle < 45_000) return "online";
  if (idle < 5 * 60_000) return "idle";
  return "offline";
}

export function activeParticipants(space: Space) {
  return space.participants.filter((p) => !p.removedAt && !p.leftAt);
}

// The participant the dashboard viewer is: the initiator, or (in the
// read-only participant view) the first member.
export function viewerParticipant(space: Space, viewer: ViewerRole) {
  return viewer === "initiator"
    ? space.participants.find((p) => p.role === "initiator")
    : space.participants.find((p) => p.role === "member");
}

function repliesTo(space: Space, activityId: number) {
  return space.activities.filter((a) => a.replyTo === activityId);
}

export function questionStatus(space: Space, question: Activity) {
  const addressed =
    question.addressedTo ?? activeParticipants(space).map((p) => p.id);
  const answered = new Set(
    repliesTo(space, question.id).flatMap((a) =>
      a.actor.kind === "participant" ? [a.actor.participantId] : [],
    ),
  );
  const waitingFor = addressed.filter((id) => {
    const participant = findParticipant(space, id);
    return participant && !participant.removedAt && !participant.leftAt
      ? !answered.has(id)
      : false;
  });
  return {
    addressed,
    answeredBy: addressed.filter((id) => answered.has(id)),
    waitingFor,
    closed: space.status === "closed" || waitingFor.length === 0,
  };
}

export function pendingQuestions(space: Space, participantId: string) {
  return space.activities.filter(
    (a) =>
      a.type === "question" &&
      (a.addressedTo?.includes(participantId) ?? true) &&
      a.createdAt >= (findParticipant(space, participantId)?.joinedAt ?? 0) &&
      questionStatus(space, a).waitingFor.includes(participantId),
  );
}

// Latest vote of every participant, grouped by option.
export function proposalTally(space: Space, proposal: Activity) {
  const latest = new Map<string, string>();
  for (const a of space.activities) {
    if (a.type !== "vote" || a.vote?.proposalId !== proposal.id) continue;
    if (a.actor.kind !== "participant") continue;
    latest.set(a.actor.participantId, a.vote.choice);
  }
  const options = proposal.options ?? [];
  return options.map((option) => ({
    option,
    voters: [...latest].filter(([, c]) => c === option).map(([id]) => id),
  }));
}

export function proposalDecision(space: Space, proposal: Activity) {
  return space.activities.find(
    (a) => a.type === "decision" && a.replyTo === proposal.id,
  );
}

export function progress(space: Space) {
  const total = space.subproblems.length;
  const decided = space.subproblems.filter(
    (s) => s.status === "decided",
  ).length;
  return { total, decided, percent: total ? (decided / total) * 100 : 0 };
}

export function currentSubproblem(space: Space): Subproblem | undefined {
  return (
    space.subproblems.find(
      (s) => s.status === "discussing" || s.status === "conflict",
    ) ?? space.subproblems.find((s) => s.status === "open")
  );
}

export function openQuestions(space: Space) {
  if (space.status !== "open") return [];
  return space.activities.filter(
    (a) => a.type === "question" && !questionStatus(space, a).closed,
  );
}

export function lastActivity(space: Space) {
  return space.activities.at(-1);
}
