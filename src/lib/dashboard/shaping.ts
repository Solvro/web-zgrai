import type { DraftField, Space } from "./types";

// Mock of the Master in stage 1. The real one is an LLM that calls
// `update_draft`; this one walks a fixed list of questions and fills the
// draft from keywords, so the flow can be built and tested without a model.

type Domain = "trip" | "project" | "research" | "event" | "generic";

const KEYWORDS: Record<Exclude<Domain, "generic">, string[]> = {
  trip: [
    "trip",
    "travel",
    "holiday",
    "vacation",
    "weekend",
    "wyjazd",
    "wycieczk",
    "urlop",
    "wakacj",
  ],
  project: [
    "project",
    "course",
    "assignment",
    "thesis",
    "hackathon",
    "projekt",
    "studia",
    "zaliczen",
  ],
  research: ["research", "survey", "study", "paper", "badan", "ankiet"],
  event: [
    "party",
    "event",
    "meetup",
    "birthday",
    "wedding",
    "impreza",
    "urodzin",
    "spotkanie",
  ],
};

const GOALS: Record<Domain, string> = {
  trip: "Decide where and when we go, where we sleep and how we get there.",
  project:
    "Agree on the scope and split the work, so everyone knows what to do and by when.",
  research:
    "Agree on the research question and the method, and split the work.",
  event: "Pick a date and a place everyone can make, and plan food and budget.",
  generic: "Reach a decision everyone can live with.",
};

export const SUBPROBLEM_TEMPLATES: Record<Domain, string[]> = {
  trip: ["Destination", "Dates", "Accommodation", "Transport"],
  project: ["Scope", "Split of tasks", "Milestones", "Tools and repo"],
  research: ["Research question", "Method", "Split of work", "Timeline"],
  event: ["Date", "Place", "Food and drinks", "Budget"],
  generic: ["Options", "Criteria", "Decision", "Next steps"],
};

export function detectDomain(text: string): Domain {
  const lower = text.toLowerCase();
  for (const [domain, words] of Object.entries(KEYWORDS)) {
    if (words.some((word) => lower.includes(word))) return domain as Domain;
  }
  return "generic";
}

function titleFrom(description: string) {
  const firstSentence = description.split(/[.!?\n]/)[0]?.trim() ?? "";
  const cleaned = firstSentence
    .replace(/^(i|we)\s+(want|need|would like)\s+to\s+/i, "")
    .replace(/^(chcę|chcemy|musimy)\s+/i, "");
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 48 ? `${title.slice(0, 47).trimEnd()}…` : title;
}

const NO_ANSWERS = /^(no|nope|none|nothing|nie|brak|nic)\b/i;

export type ShapingPatch = Partial<
  Pick<Space, "title" | "goal" | "description" | "constraints" | "deadline">
> & { subproblems?: string[] };

export type ShapingReply = {
  text: string;
  patch: ShapingPatch;
  fields: DraftField[];
};

// `answerIndex` is the number of initiator messages before this one.
export function shapingReply(
  space: Space,
  text: string,
  answerIndex: number,
): ShapingReply {
  const domain = detectDomain(`${space.description} ${space.title} ${text}`);

  if (answerIndex === 0) {
    const title = titleFrom(text) || "New space";
    return {
      text: `Got it. I've drafted a title and a goal on the right. Who takes part, and roughly how many people?`,
      patch: { title, goal: GOALS[domain], description: text },
      fields: ["title", "goal", "description"],
    };
  }

  if (answerIndex === 1) {
    return {
      text: "Is there a deadline for the decision, or fixed dates I should know about?",
      patch: { constraints: [...space.constraints, `People: ${text}`] },
      fields: ["constraints"],
    };
  }

  if (answerIndex === 2) {
    const subproblems = SUBPROBLEM_TEMPLATES[domain];
    return {
      text: `I'd split it into ${subproblems.length} subproblems: ${subproblems.join(", ")}. I'll go through them one by one with the agents. Add, remove or rename them on the right. Is anything non-negotiable?`,
      patch: {
        constraints: [...space.constraints, `Timing: ${text}`],
        subproblems,
      },
      fields: ["constraints", "subproblems"],
    };
  }

  if (answerIndex === 3) {
    return {
      text: `Thanks, the draft is ready. If it looks right, open the space and I'll prepare the invite. You can still keep chatting to adjust it.`,
      patch: NO_ANSWERS.test(text)
        ? {}
        : { constraints: [...space.constraints, text] },
      fields: NO_ANSWERS.test(text) ? [] : ["constraints"],
    };
  }

  const goal = text.match(/^goal:\s*(.+)/i)?.[1];
  if (goal) {
    return {
      text: "Updated the goal.",
      patch: { goal },
      fields: ["goal"],
    };
  }
  const title = text.match(/^title:\s*(.+)/i)?.[1];
  if (title) {
    return {
      text: "Renamed the space.",
      patch: { title },
      fields: ["title"],
    };
  }
  return {
    text: `Added it to the constraints. Start a message with "goal:" or "title:" to change those instead.`,
    patch: { constraints: [...space.constraints, text] },
    fields: ["constraints"],
  };
}
