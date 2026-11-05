import { defineTool } from "eve/tools";
import { z } from "zod";
import { markCriterion } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Mark a success criterion as met (or no longer met), with the evidence: the decision, votes or messages that show it.",
  inputSchema: z.object({
    criterion_id: z.string(),
    met: z.boolean(),
    evidence: z
      .string()
      .optional()
      .describe("Why it is met, e.g. 'Decision #42: Paris, 12-18 May'."),
  }),
  async execute({ criterion_id, met, evidence }, ctx) {
    const space = await toolSpace(ctx);
    return markCriterion(space.id, criterion_id, { met, evidence });
  },
});
