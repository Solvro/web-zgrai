import { defineTool } from "eve/tools";
import { z } from "zod";
import { getQuestionOrThrow } from "@/lib/master/questions";
import { toolSpace } from "@/lib/master/tool-space";
import { rescheduleDeadline } from "@/lib/master/wake";

export default defineTool({
  description:
    "Give participants more time to answer a question: its deadline moves to this many minutes from now, also after it already passed. Doesn't post anything; tell people with post_message or remind if they should know.",
  inputSchema: z.object({
    question_id: z.number().int(),
    minutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60),
  }),
  async execute({ question_id, minutes }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open")
      throw new Error("Deadlines need an open space.");
    await getQuestionOrThrow(space.id, question_id);
    const dueAt = await rescheduleDeadline(space.id, question_id, minutes);
    return { question_id, deadline: dueAt.toISOString() };
  },
});
