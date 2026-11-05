import { defineTool } from "eve/tools";
import { z } from "zod";
import { findPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { DEFAULT_DEADLINE_MINUTES, scheduleDeadline } from "@/lib/master/wake";
import { ask } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Ask participants a question. Without participant_ids it goes to everyone. In an open space the question gets a deadline; when it passes you get a <deadline> event listing who didn't answer.",
  inputSchema: z.object({
    question: z.string().min(1),
    participant_ids: z
      .array(z.string())
      .optional()
      .describe(
        "Participant ids (without the participant: prefix) to ask. Omit to ask everyone.",
      ),
    deadline_minutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional()
      .describe(
        `Minutes to wait for answers. Default ${DEFAULT_DEADLINE_MINUTES}.`,
      ),
  }),
  async execute({ question, participant_ids, deadline_minutes }, ctx) {
    const space = await toolSpace(ctx);
    const quoted = await findPrivateQuote(space.id, question);
    if (quoted) {
      throw new Error(
        `This repeats a participant's private note ("${quoted}"). Rephrase without revealing it.`,
      );
    }
    const row = await ask({
      spaceId: space.id,
      question,
      participantIds: participant_ids,
    });
    if (space.status !== "open") return { question_id: row.id };
    const dueAt = await scheduleDeadline(
      space.id,
      row.id,
      deadline_minutes ?? DEFAULT_DEADLINE_MINUTES,
    );
    return { question_id: row.id, deadline: dueAt.toISOString() };
  },
});
