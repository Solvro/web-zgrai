import { generateInviteCode } from "./invite";
import { genericScenario } from "./scenarios";
import { type ShapingPatch, shapingReply } from "./shaping";
import { forgetParticipant, startScenario, stopScenario } from "./simulation";
import {
  MOCK_USER,
  addActivity,
  deleteSpace,
  getState,
  insertSpace,
  makeId,
  now,
  setState,
  updateParticipant,
  updateSpace,
} from "./store";
import type { SimulationSettings, Space, ViewerRole } from "./types";

// Everything the dashboard can do. Today each action changes the mock store;
// later each one becomes a call to the server (server action or API route).

export function newSpace(fields: Partial<Space>): Space {
  return {
    id: makeId("space"),
    title: "",
    goal: "",
    description: "",
    status: "draft",
    initiatorName: MOCK_USER,
    subproblems: [],
    constraints: [],
    inviteStepDone: false,
    participants: [],
    activities: [],
    board: [],
    shaping: { messages: [], lastPatched: { fields: [], at: 0 } },
    masterThinking: false,
    createdAt: now(),
    ...fields,
  };
}

function withPatch(space: Space, patch: ShapingPatch): Space {
  const { subproblems, ...fields } = patch;
  return {
    ...space,
    ...fields,
    subproblems: subproblems
      ? subproblems.map(
          (title) =>
            space.subproblems.find((s) => s.title === title) ?? {
              id: makeId("sub"),
              title,
              status: "open",
            },
        )
      : space.subproblems,
  };
}

// Stage 1: shaping the problem with the Master.

const MASTER_REPLY_DELAY_MS = 1200;

function addInitiatorMessage(spaceId: string, text: string) {
  const space = getState().spaces[spaceId];
  const answerIndex =
    space?.shaping.messages.filter((m) => m.from === "initiator").length ?? 0;
  updateSpace(spaceId, (s) => ({
    ...s,
    masterThinking: true,
    shaping: {
      ...s.shaping,
      messages: [
        ...s.shaping.messages,
        { id: makeId("msg"), from: "initiator", text, createdAt: now() },
      ],
    },
  }));
  return answerIndex;
}

function replyAsMaster(spaceId: string, text: string, answerIndex: number) {
  const space = getState().spaces[spaceId];
  if (!space || space.status !== "draft") return;
  const reply = shapingReply(space, text, answerIndex);
  updateSpace(spaceId, (s) => ({
    ...withPatch(s, reply.patch),
    masterThinking: false,
    shaping: {
      messages: [
        ...s.shaping.messages,
        { id: makeId("msg"), from: "master", text: reply.text, createdAt: now() },
      ],
      lastPatched: { fields: reply.fields, at: now() },
    },
  }));
}

export function sendShapingMessage(spaceId: string, text: string) {
  const answerIndex = addInitiatorMessage(spaceId, text);
  setTimeout(
    () => replyAsMaster(spaceId, text, answerIndex),
    MASTER_REPLY_DELAY_MS,
  );
}

// Same as `sendShapingMessage`, but the Master answers right away. For seeds.
export function shapeNow(spaceId: string, text: string) {
  replyAsMaster(spaceId, text, addInitiatorMessage(spaceId, text));
}

export function createDraft(description: string) {
  const space = newSpace({ description });
  insertSpace(space);
  sendShapingMessage(space.id, description);
  return space.id;
}

export function updateDraft(spaceId: string, patch: ShapingPatch) {
  updateSpace(spaceId, (space) => withPatch(space, patch));
}

export function discardDraft(spaceId: string) {
  deleteSpace(spaceId);
}

export function draftIssues(space: Space) {
  const issues: string[] = [];
  if (!space.title.trim()) issues.push("a title");
  if (!space.goal.trim()) issues.push("a goal");
  if (!space.subproblems.some((s) => s.title.trim())) {
    issues.push("at least one subproblem");
  }
  return issues;
}

export function openSpace(spaceId: string) {
  const space = getState().spaces[spaceId];
  if (!space || space.status !== "draft" || draftIssues(space).length) return;
  updateSpace(spaceId, (s) => ({
    ...s,
    status: "open",
    openedAt: now(),
    inviteCode: generateInviteCode(),
    masterThinking: false,
    subproblems: s.subproblems
      .filter((sub) => sub.title.trim())
      .map((sub) => ({ ...sub, id: makeId("sub"), status: "open" })),
    constraints: s.constraints.filter((c) => c.trim()),
  }));
  addActivity(spaceId, {
    type: "system",
    actor: { kind: "system" },
    tool: "create_space",
    summary: `${space.initiatorName} opened the space`,
  });
  const opened = getState().spaces[spaceId];
  if (opened) startScenario(spaceId, genericScenario(opened));
}

export function finishInviteStep(spaceId: string) {
  updateSpace(spaceId, (space) => ({ ...space, inviteStepDone: true }));
}

// Stage 2: the initiator's admin actions. They mirror the initiator's MCP
// tools in CONCEPT.md.

export function updateGoal(spaceId: string, goal: string) {
  const space = getState().spaces[spaceId];
  if (!space || !goal.trim() || goal === space.goal) return;
  updateSpace(spaceId, (s) => ({ ...s, goal }));
  addActivity(spaceId, {
    type: "system",
    actor: { kind: "system" },
    tool: "update_goal",
    summary: `${space.initiatorName} changed the goal`,
    content: goal,
  });
  addActivity(spaceId, {
    type: "message",
    actor: { kind: "master" },
    tool: "post_message",
    summary: "Told everyone about the new goal",
    content: `Heads-up: the goal has changed. New goal: ${goal}`,
  });
}

export function regenerateInvite(spaceId: string) {
  updateSpace(spaceId, (space) => ({
    ...space,
    inviteCode: generateInviteCode(),
  }));
  addActivity(spaceId, {
    type: "system",
    actor: { kind: "system" },
    tool: "create_invite",
    summary: "New invite code. The old one no longer works",
  });
}

export function removeParticipant(spaceId: string, participantId: string) {
  const space = getState().spaces[spaceId];
  const participant = space?.participants.find((p) => p.id === participantId);
  if (!space || !participant) return;
  forgetParticipant(spaceId, participantId);
  updateParticipant(spaceId, participantId, (p) => ({
    ...p,
    removedAt: now(),
  }));
  addActivity(spaceId, {
    type: "system",
    actor: { kind: "system" },
    tool: "remove_participant",
    summary: `${space.initiatorName} removed ${participant.represents}'s agent`,
  });
}

export function suggestedSummary(space: Space) {
  const pins = space.board.filter((item) => item.kind === "pin");
  return pins.map((pin) => `${pin.title}: ${pin.content}.`).join(" ");
}

export function closeSpace(spaceId: string, summary: string) {
  const space = getState().spaces[spaceId];
  if (!space || space.status !== "open") return;
  stopScenario(spaceId);
  updateSpace(spaceId, (s) => ({
    ...s,
    status: "closed",
    summary,
    closedAt: now(),
    masterThinking: false,
  }));
  addActivity(spaceId, {
    type: "system",
    actor: { kind: "system" },
    tool: "close_space",
    summary: `${space.initiatorName} closed the space`,
    content: summary || undefined,
  });
}

// Demo controls.

export function setViewer(viewer: ViewerRole) {
  setState((state) => ({ ...state, viewer }));
}

export function setSimulation(settings: Partial<SimulationSettings>) {
  setState((state) => ({
    ...state,
    simulation: { ...state.simulation, ...settings },
  }));
}
