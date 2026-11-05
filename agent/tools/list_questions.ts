import { defineTool } from "eve/tools";
import { z } from "zod";
import { getQuestionStatuses } from "@/lib/master/questions";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "List your questions with who was asked, who answered (said anything or shared context since) and who is still missing, plus the deadline if you are still waiting.",
  inputSchema: z.object({
    question_ids: z.array(z.number().int()).optional(),
    unanswered_only: z
      .boolean()
      .optional()
      .describe("Only questions someone hasn't answered yet."),
    limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
  }),
  async execute({ question_ids, unanswered_only, limit }, ctx) {
    const space = await toolSpace(ctx);
    const questions = await getQuestionStatuses(space.id, {
      ids: question_ids,
      limit: unanswered_only ? 50 : (limit ?? 20),
    });
    return {
      questions: questions
        .filter((q) => !unanswered_only || q.missing.length > 0)
        .slice(-(limit ?? 20)),
    };
  },
});
