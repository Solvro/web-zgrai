import {
  addActivity,
  getState,
  makeId,
  now,
  removeBoardItem,
  touchParticipant,
  updateSpace,
  upsertBoardItem,
  withClock,
} from "./store";
import type { ActivityInput } from "./store";
import type { Participant, SubproblemStatus } from "./types";

// Plays scripted scenarios against the mock store, standing in for real
// agents and the real Master until the backend exists. Every step is one
// thing that would arrive over MCP or from the Master loop.

export type ScenarioContext = {
  system(summary: string, tool?: string): void;
  join(
    key: string,
    input: {
      name: string;
      harness: string;
      role?: Participant["role"];
      intro?: string;
    },
  ): void;
  say(
    key: string,
    summary: string,
    options?: {
      content?: string;
      replyTo?: string;
      ref?: string;
      private?: boolean;
    },
  ): void;
  share(
    key: string,
    topic: string,
    summary: string,
    options?: { content?: string; replyTo?: string },
  ): void;
  retract(key: string, summary: string): void;
  vote(key: string, proposal: string, choice: string, comment?: string): void;
  leave(key: string): void;
  // A silent agent stops polling, so it drifts to "idle" and "offline".
  silent(key: string, silent: boolean): void;
  master: {
    thinking(): void;
    post(summary: string, options?: { content?: string; ref?: string }): void;
    ask(
      summary: string,
      options?: {
        to?: string[];
        content?: string;
        deadlineMs?: number;
        subproblem?: string;
        ref?: string;
      },
    ): void;
    propose(
      summary: string,
      options: string[],
      extra?: { content?: string; subproblem?: string; ref?: string },
    ): void;
    decide(
      summary: string,
      options: {
        subproblem: string;
        decision: string;
        replyTo?: string;
        content?: string;
      },
    ): void;
    status(subproblem: string, status: SubproblemStatus): void;
    note(title: string, content: string): void;
    pin(title: string, content: string): void;
    unpin(title: string): void;
    close(summary: string): void;
  };
};

export type ScenarioStep = {
  wait: number;
  run: (ctx: ScenarioContext) => void;
};

type Run = {
  spaceId: string;
  steps: ScenarioStep[];
  index: number;
  nextAt: number;
  keys: Map<string, string>;
  refs: Map<string, number>;
  polling: Set<string>;
  // Seeded history runs at 1x, whatever the current speed is.
  preplaying: boolean;
  ctx: ScenarioContext;
};

const runs = new Map<string, Run>();

function speed() {
  return getState().simulation.speed;
}

function createRun(spaceId: string, steps: ScenarioStep[]): Run {
  const run: Run = {
    spaceId,
    steps,
    index: 0,
    nextAt: 0,
    keys: new Map(),
    refs: new Map(),
    polling: new Set(),
    preplaying: false,
    ctx: undefined as unknown as ScenarioContext,
  };

  const space = () => getState().spaces[spaceId];

  const participantId = (key: string) => {
    const id = run.keys.get(key);
    if (!id) return undefined;
    const participant = space()?.participants.find((p) => p.id === id);
    if (!participant || participant.removedAt || participant.leftAt) {
      return undefined;
    }
    return id;
  };

  const ref = (name: string | undefined) =>
    name ? run.refs.get(name) : undefined;

  const subproblemId = (title: string | undefined) =>
    title
      ? space()?.subproblems.find((s) => s.title === title)?.id
      : undefined;

  const setSubproblem = (
    title: string,
    status: SubproblemStatus,
    decision?: string,
  ) => {
    updateSpace(spaceId, (s) => ({
      ...s,
      subproblems: s.subproblems.map((sp) =>
        sp.title === title
          ? { ...sp, status, decision: decision ?? sp.decision }
          : sp,
      ),
    }));
  };

  const fromAgent = (
    key: string,
    input: Omit<ActivityInput, "actor">,
    refName?: string,
  ) => {
    const id = participantId(key);
    if (!id) return;
    touchParticipant(spaceId, id);
    const activity = addActivity(spaceId, {
      ...input,
      actor: { kind: "participant", participantId: id },
    });
    if (refName) run.refs.set(refName, activity.id);
  };

  const fromMaster = (input: Omit<ActivityInput, "actor">, refName?: string) => {
    updateSpace(spaceId, (s) => ({ ...s, masterThinking: false }));
    const activity = addActivity(spaceId, { ...input, actor: { kind: "master" } });
    if (refName) run.refs.set(refName, activity.id);
  };

  run.ctx = {
    system(summary, tool) {
      addActivity(spaceId, { type: "system", actor: { kind: "system" }, tool, summary });
    },
    join(key, { name, harness, role = "member", intro }) {
      const id = makeId("p");
      run.keys.set(key, id);
      run.polling.add(id);
      updateSpace(spaceId, (s) => ({
        ...s,
        participants: [
          ...s.participants,
          {
            id,
            represents: name,
            role,
            harness,
            joinedAt: now(),
            lastSeenAt: now(),
          },
        ],
      }));
      fromAgent(key, {
        type: "joined",
        tool: "join_space",
        summary: `${name}'s agent joined from ${harness}`,
        content: [`Joining, I represent ${name}.`, intro]
          .filter(Boolean)
          .join(" "),
      });
    },
    say(key, summary, options = {}) {
      fromAgent(
        key,
        {
          type: "message",
          tool: "send_message",
          summary,
          content: options.content,
          replyTo: ref(options.replyTo),
          visibility: options.private ? "master" : "all",
        },
        options.ref,
      );
    },
    share(key, topic, summary, options = {}) {
      fromAgent(key, {
        type: "shared_context",
        tool: "share_context",
        summary,
        content: options.content ? `Topic: ${topic}\n\n${options.content}` : undefined,
        replyTo: ref(options.replyTo),
      });
    },
    retract(key, summary) {
      fromAgent(key, {
        type: "retracted_context",
        tool: "retract_context",
        summary,
      });
    },
    vote(key, proposal, choice, comment) {
      const proposalId = ref(proposal);
      if (proposalId === undefined) return;
      fromAgent(key, {
        type: "vote",
        tool: "vote",
        summary: comment ? `Voted "${choice}": ${comment}` : `Voted "${choice}"`,
        replyTo: proposalId,
        vote: { proposalId, choice },
      });
    },
    leave(key) {
      const id = participantId(key);
      if (!id) return;
      fromAgent(key, { type: "left", tool: "leave_space", summary: "Left the space" });
      run.polling.delete(id);
      updateSpace(spaceId, (s) => ({
        ...s,
        participants: s.participants.map((p) =>
          p.id === id ? { ...p, leftAt: now() } : p,
        ),
      }));
    },
    silent(key, silent) {
      const id = run.keys.get(key);
      if (!id) return;
      if (silent) run.polling.delete(id);
      else run.polling.add(id);
    },
    master: {
      thinking() {
        updateSpace(spaceId, (s) => ({ ...s, masterThinking: true }));
      },
      post(summary, options = {}) {
        fromMaster(
          {
            type: "message",
            tool: "post_message",
            summary,
            content: options.content,
          },
          options.ref,
        );
      },
      ask(summary, options = {}) {
        if (options.subproblem) setSubproblem(options.subproblem, "discussing");
        fromMaster(
          {
            type: "question",
            tool: "ask",
            summary,
            content: options.content,
            addressedTo: options.to
              ?.map((key) => participantId(key))
              .filter((id): id is string => Boolean(id)),
            deadline: options.deadlineMs
              ? now() + options.deadlineMs / (run.preplaying ? 1 : speed())
              : undefined,
            subproblemId: subproblemId(options.subproblem),
          },
          options.ref,
        );
      },
      propose(summary, options, extra = {}) {
        fromMaster(
          {
            type: "proposal",
            tool: "propose",
            summary,
            content: extra.content,
            options,
            subproblemId: subproblemId(extra.subproblem),
          },
          extra.ref,
        );
      },
      decide(summary, { subproblem, decision, replyTo, content }) {
        setSubproblem(subproblem, "decided", decision);
        fromMaster({
          type: "decision",
          tool: "record_decision",
          summary,
          content,
          replyTo: ref(replyTo),
          subproblemId: subproblemId(subproblem),
        });
        upsertBoardItem(spaceId, { kind: "pin", title: subproblem, content: decision });
      },
      status(subproblem, status) {
        setSubproblem(subproblem, status);
      },
      note(title, content) {
        upsertBoardItem(spaceId, { kind: "note", title, content });
      },
      pin(title, content) {
        upsertBoardItem(spaceId, { kind: "pin", title, content });
      },
      unpin(title) {
        removeBoardItem(spaceId, "pin", title);
      },
      close(summary) {
        fromMaster({
          type: "system",
          tool: "close_space",
          summary: "Closed the space: the goal is reached",
          content: summary,
        });
        updateSpace(spaceId, (s) => ({
          ...s,
          status: "closed",
          summary,
          closedAt: now(),
        }));
      },
    },
  };

  return run;
}

export function startScenario(
  spaceId: string,
  steps: ScenarioStep[],
  options: { preplay?: number; endAt?: number } = {},
) {
  const run = createRun(spaceId, steps);
  runs.set(spaceId, run);

  const preplay = Math.min(options.preplay ?? 0, steps.length);
  if (preplay > 0) {
    const duration = steps
      .slice(0, preplay)
      .reduce((sum, step) => sum + step.wait, 0);
    let time = (options.endAt ?? Date.now()) - duration;
    run.preplaying = true;
    for (const step of steps.slice(0, preplay)) {
      time += step.wait;
      withClock(time, () => step.run(run.ctx));
    }
    run.preplaying = false;
    run.index = preplay;
  }

  const next = steps[run.index];
  run.nextAt = Date.now() + (next ? next.wait / speed() : 0);
}

export function stopScenario(spaceId: string) {
  runs.delete(spaceId);
}

export function forgetParticipant(spaceId: string, participantId: string) {
  runs.get(spaceId)?.polling.delete(participantId);
}

const TICK_MS = 200;
const HEARTBEAT_MS = 5_000;

let lastTick = 0;
let lastHeartbeat = 0;

function tick() {
  const time = Date.now();
  const delta = lastTick ? time - lastTick : 0;
  lastTick = time;
  const { simulation, spaces } = getState();

  for (const run of runs.values()) {
    const space = spaces[run.spaceId];
    if (!space || space.status !== "open") {
      runs.delete(run.spaceId);
      continue;
    }
    if (simulation.paused) {
      run.nextAt += delta;
      continue;
    }
    // One step per tick, so bubbles show up one by one even after a pause.
    const step = run.steps[run.index];
    if (step && time >= run.nextAt) {
      step.run(run.ctx);
      run.index += 1;
      const next = run.steps[run.index];
      if (next) run.nextAt = time + next.wait / simulation.speed;
    }
  }

  // Polling agents show up as "last seen" without bubbles in the chat.
  if (time - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = time;
    for (const run of runs.values()) {
      for (const id of run.polling) touchParticipant(run.spaceId, id);
    }
  }
}

export function startTicker() {
  const handle = setInterval(tick, TICK_MS);
  return () => clearInterval(handle);
}
