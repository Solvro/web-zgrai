import { defineTool } from "eve/tools";
import { z } from "zod";
import { assertNoPrivateQuote } from "@/lib/master/privacy";
import { getQuestionOrThrow } from "@/lib/master/questions";
import { toolSpace } from "@/lib/master/tool-space";
import { rescheduleDeadline } from "@/lib/master/wake";
import { postMasterMessage } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Nudge the participants who haven't answered one of your questions yet. Posts a reminder addressed only to them and can give them more time. Does nothing if everyone answered.",
  inputSchema: z.object({
    question_id: z.number().int(),
    text: z
      .string()
      .min(1)
      .optional()
      .describe("Your reminder. Defaults to repeating the question."),
    extend_minutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional()
      .describe("Set a new deadline this many minutes from now."),
  }),
  async execute({ question_id, text, extend_minutes }, ctx) {
    const space = await toolSpace(ctx);
    const question = await getQuestionOrThrow(space.id, question_id);
    if (question.missing.length === 0) return { reminded: [] };
    const reminder = text ?? `Reminder: ${question.question}`;
    await assertNoPrivateQuote(space.id, reminder);
    const row = await postMasterMessage({
      spaceId: space.id,
      text: reminder,
      replyTo: question_id,
      addressedTo: question.missing.map((p) => p.participant_id),
    });
    const deadline =
      extend_minutes && space.status === "open"
        ? await rescheduleDeadline(space.id, question_id, extend_minutes)
        : null;
    return {
      message_id: row.id,
      reminded: question.missing,
      deadline: deadline?.toISOString() ?? question.deadline,
    };
  },
});
