import { useSyncExternalStore } from "react";
import type {
  Activity,
  BoardItem,
  Participant,
  SimulationSettings,
  Space,
  ViewerRole,
} from "./types";

// In-memory mock of the server state. It lives in the browser only and is
// reset on reload. Persistence, auth and the real API come later; until then
// components read through the hooks below and write through `actions.ts`.

export type DashboardState = {
  spaces: Record<string, Space>;
  // Space ids, newest first.
  order: string[];
  viewer: ViewerRole;
  simulation: SimulationSettings;
};

// The signed-in user, until auth is wired into the dashboard.
export const MOCK_USER = "Ola";

let state: DashboardState = {
  spaces: {},
  order: [],
  viewer: "initiator",
  simulation: { paused: false, speed: 1 },
};

const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: (state: DashboardState) => DashboardState) {
  state = update(state);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDashboardState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useSpace(id: string): Space | undefined {
  return useDashboardState().spaces[id];
}

// Seeded history is generated with a moved clock, so it looks like it
// happened over the last minutes.
let clockOverride: number | null = null;

export function now() {
  return clockOverride ?? Date.now();
}

export function withClock(time: number, run: () => void) {
  const previous = clockOverride;
  clockOverride = time;
  try {
    run();
  } finally {
    clockOverride = previous;
  }
}

let idCounter = 0;
let activityCounter = 0;

export function makeId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

export function insertSpace(space: Space) {
  setState((s) => ({
    ...s,
    spaces: { ...s.spaces, [space.id]: space },
    order: [space.id, ...s.order.filter((id) => id !== space.id)],
  }));
}

export function deleteSpace(id: string) {
  setState((s) => {
    const spaces = { ...s.spaces };
    delete spaces[id];
    return { ...s, spaces, order: s.order.filter((other) => other !== id) };
  });
}

export function updateSpace(id: string, update: (space: Space) => Space) {
  setState((s) => {
    const space = s.spaces[id];
    if (!space) return s;
    return { ...s, spaces: { ...s.spaces, [id]: update(space) } };
  });
}

export type ActivityInput = Omit<
  Activity,
  "id" | "createdAt" | "visibility"
> & {
  visibility?: Activity["visibility"];
};

export function addActivity(spaceId: string, input: ActivityInput) {
  activityCounter += 1;
  const activity: Activity = {
    visibility: "all",
    ...input,
    id: activityCounter,
    createdAt: now(),
  };
  updateSpace(spaceId, (space) => ({
    ...space,
    activities: [...space.activities, activity],
  }));
  return activity;
}

export function updateParticipant(
  spaceId: string,
  participantId: string,
  update: (participant: Participant) => Participant,
) {
  updateSpace(spaceId, (space) => ({
    ...space,
    participants: space.participants.map((p) =>
      p.id === participantId ? update(p) : p,
    ),
  }));
}

export function touchParticipant(spaceId: string, participantId: string) {
  updateParticipant(spaceId, participantId, (p) => ({
    ...p,
    lastSeenAt: now(),
  }));
}

// Notes and pins are keyed by kind and title, so the Master can rewrite a
// note ("What we know") instead of piling up new ones.
export function upsertBoardItem(
  spaceId: string,
  item: Pick<BoardItem, "kind" | "title" | "content">,
) {
  updateSpace(spaceId, (space) => {
    const existing = space.board.find(
      (b) => b.kind === item.kind && b.title === item.title,
    );
    const board = existing
      ? space.board.map((b) =>
          b === existing
            ? { ...b, content: item.content, updatedAt: now() }
            : b,
        )
      : [...space.board, { id: makeId("board"), ...item, updatedAt: now() }];
    return { ...space, board };
  });
}

export function removeBoardItem(
  spaceId: string,
  kind: BoardItem["kind"],
  title: string,
) {
  updateSpace(spaceId, (space) => ({
    ...space,
    board: space.board.filter((b) => !(b.kind === kind && b.title === title)),
  }));
}
