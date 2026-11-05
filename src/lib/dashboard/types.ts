// Client-side shapes of the dashboard. They mirror the data model draft in
// CONCEPT.md, so the mock store can later be swapped for the real API.

export type SpaceStatus = "draft" | "open" | "closed";

export type SubproblemStatus = "open" | "discussing" | "conflict" | "decided";

export type Subproblem = {
  id: string;
  title: string;
  status: SubproblemStatus;
  decision?: string;
};

export type Participant = {
  id: string;
  represents: string;
  role: "initiator" | "member";
  harness: string;
  joinedAt: number;
  lastSeenAt: number;
  leftAt?: number;
  removedAt?: number;
};

export type Actor =
  | { kind: "master" }
  | { kind: "system" }
  | { kind: "participant"; participantId: string };

export type ActivityType =
  | "joined"
  | "left"
  | "message"
  | "question"
  | "proposal"
  | "vote"
  | "decision"
  | "shared_context"
  | "retracted_context"
  | "system";

// One bubble in the live chat: a single agent -> MCP -> Master interaction,
// or one action of the Master.
export type Activity = {
  id: number;
  type: ActivityType;
  actor: Actor;
  // MCP tool called by an agent, or the Master's internal tool.
  tool?: string;
  // Shown to everyone, so it never contains private details.
  summary: string;
  content?: string;
  // "private": `content` is for the author and the Master only.
  visibility: "all" | "private";
  addressedTo?: string[];
  replyTo?: number;
  deadline?: number;
  options?: string[];
  vote?: { proposalId: number; choice: string };
  subproblemId?: string;
  createdAt: number;
};

export type BoardItem = {
  id: string;
  kind: "note" | "pin";
  title: string;
  content: string;
  updatedAt: number;
};

export type ShapingMessage = {
  id: string;
  from: "initiator" | "master";
  text: string;
  createdAt: number;
};

export type DraftField =
  "title" | "goal" | "description" | "subproblems" | "constraints" | "deadline";

export type Space = {
  id: string;
  title: string;
  goal: string;
  description: string;
  status: SpaceStatus;
  initiatorName: string;
  subproblems: Subproblem[];
  constraints: string[];
  deadline?: string;
  inviteCode?: string;
  inviteStepDone: boolean;
  participants: Participant[];
  activities: Activity[];
  board: BoardItem[];
  shaping: {
    messages: ShapingMessage[];
    // Fields the Master changed last, so the draft editor can highlight them.
    lastPatched: { fields: DraftField[]; at: number };
  };
  masterThinking: boolean;
  summary?: string;
  createdAt: number;
  openedAt?: number;
  closedAt?: number;
};

export type ViewerRole = "initiator" | "participant";

export type SimulationSettings = {
  paused: boolean;
  speed: number;
};
