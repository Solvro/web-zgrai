import { defineTool } from "eve/tools";
import { z } from "zod";
import { getQuestionOrThrow } from "@/lib/master/questions";
import { toolSpace } from "@/lib/master/tool-space";
import { cancelDeadline } from "@/lib/master/wake";

export default defineTool({
  description:
    "Stop waiting for answers to a question, e.g. when you have enough to move on or it no longer matters. Its deadline is cancelled, so no <deadline> event comes for it.",
  inputSchema: z.object({ question_id: z.number().int() }),
  async execute({ question_id }, ctx) {
    const space = await toolSpace(ctx);
    const question = await getQuestionOrThrow(space.id, question_id);
    const cancelled = await cancelDeadline(space.id, question_id);
    return { question_id, cancelled, still_missing: question.missing };
  },
});
