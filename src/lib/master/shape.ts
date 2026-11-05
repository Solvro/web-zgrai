import { xai } from "@ai-sdk/xai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { truncate } from "@/lib/spaces/service";

const SHAPE_TIMEOUT_MS = 20_000;

const shapeSchema = z.object({
  title: z
    .string()
    .describe("A short, friendly name for the problem, at most 40 chars."),
  goal: z
    .string()
    .describe("One sentence: what the group must decide, with hard limits."),
  steps: z
    .array(z.string())
    .describe(
      "Three to six short step names, in the order the group should decide them.",
    ),
  constraints: z
    .array(z.string())
    .describe("Hard constraints stated in the description, e.g. budget caps."),
  criteria: z
    .array(z.string())
    .describe(
      "Two to four checkable statements that, once all true, mean the whole task is done.",
    ),
});

export type ShapedProblem = z.infer<typeof shapeSchema>;

const SYSTEM = `You turn a short description of a group decision into a plan
for zgrai.pl, where each person's AI agent joins and a Master agent leads the
group through the steps. Always write in English, whatever the language of the
description. Keep step names to one to three words, like "Destination",
"Budget", "Dates", "Accommodation", "Transport". Only list constraints that the
description states; don't invent any.`;

// The first clause, cut at a word: "Plan a May trip for 10 friends".
function fallbackTitle(description: string) {
  const clause = description.split(/[:.!?\n]/)[0]?.trim() || description;
  if (clause.length <= 48) return clause;
  const cut = clause.slice(0, 48);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;]$/, "")}…`;
}

function fallback(description: string): ShapedProblem {
  return {
    title: fallbackTitle(description),
    goal: description,
    steps: [],
    constraints: [],
    criteria: [],
  };
}

// One quick model call so the session opens with a title, steps and success
// criteria. Without an xAI key, or when the call fails, the Master plans them
// on its first turn instead.
export async function shapeProblem(
  description: string,
): Promise<ShapedProblem> {
  if (!process.env.XAI_API_KEY) return fallback(description);
  try {
    const { output } = await generateText({
      model: xai(process.env.XAI_MODEL ?? "grok-4.7"),
      system: SYSTEM,
      prompt: description,
      output: Output.object({ schema: shapeSchema }),
      abortSignal: AbortSignal.timeout(SHAPE_TIMEOUT_MS),
    });
    return {
      title: truncate(output.title, 48),
      goal: output.goal.trim() || description,
      steps: output.steps
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      constraints: output.constraints.map((c) => c.trim()).filter(Boolean),
      criteria: output.criteria
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 6),
    };
  } catch (error) {
    console.error("Shaping the problem failed, opening without steps", error);
    return fallback(description);
  }
}
