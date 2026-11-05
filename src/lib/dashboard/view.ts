// What the dashboard gets from the server. No server imports, so client
// components can use these types.

export const AGENT_COLORS = [
  "#2563EB",
  "#F97316",
  "#14B8A6",
  "#8B5CF6",
  "#EC4899",
  "#EAB308",
  "#0EA5E9",
  "#6366F1",
  "#22C55E",
  "#EF4444",
] as const;

export const MASTER_COLOR = "#0A0A0A";

export function agentColor(index: number) {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

// "no-agent": the initiator started the space on the dashboard and their own
// agent hasn't joined yet.
export type PresenceStatus = "online" | "dozing" | "no-agent";

export type ViewPerson = {
  id: string;
  name: string;
  role: "initiator" | "member";
  color: string;
  status: PresenceStatus;
  harness: string | null;
  isMe: boolean;
  left: boolean;
};

export type StepStatus = "done" | "now" | "next";

export type ViewOpinion = {
  participantId: string;
  text: string;
};

export type ViewStep = {
  id: string;
  title: string;
  status: StepStatus;
  conflict: boolean;
  decision?: string;
  opinions: ViewOpinion[];
};

export type ViewAuthor =
  | { type: "master" }
  | { type: "system" }
  | { type: "participant"; participantId: string };

export type ViewMessage = {
  id: number;
  kind: "message" | "question" | "proposal" | "decision" | "system";
  author: ViewAuthor;
  text: string;
  stepId: string | null;
  withdrawn: boolean;
  private: boolean;
  viaDashboard: boolean;
  createdAt: string;
  tally?: { yes: number; no: number; abstain: number };
};

export type ViewCriterion = {
  id: string;
  text: string;
  met: boolean;
  evidence?: string;
};

// The final plan everyone votes on once all criteria are met. The space ends
// when every active participant approved it.
export type ViewFinalPlan = {
  proposalId: number;
  text: string;
  approvedBy: string[];
  waitingFor: string[];
  notApproving: string[];
};

export type SessionView = {
  space: {
    id: string;
    title: string;
    goal: string;
    status: "draft" | "open" | "closed";
    summary: string | null;
  };
  me: { participantId: string; role: "initiator" | "member" };
  people: ViewPerson[];
  steps: ViewStep[];
  criteria: ViewCriterion[];
  finalPlan: ViewFinalPlan | null;
  messages: ViewMessage[];
  cursor: number;
};

export type ProblemSummary = {
  id: string;
  title: string;
  status: "draft" | "open" | "closed";
  role: "initiator" | "member";
  initiatorName: string;
  bots: { color: string; awake: boolean }[];
  stepsTotal: number;
  stepsDone: number;
  currentStep: string | null;
  nextStep: string | null;
  agentsJoined: number;
  closedAt: string | null;
};
