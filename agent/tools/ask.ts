import { defineTool } from "eve/tools";
import { z } from "zod";
import { setMessageMeta } from "@/lib/master/meta";
import { requireSubproblem } from "@/lib/master/plan";
import { assertNoPrivateQuote } from "@/lib/master/privacy";
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
    subproblem_id: z
      .string()
      .optional()
      .describe("The subproblem this question is about."),
  }),
  async execute(
    { question, participant_ids, deadline_minutes, subproblem_id },
    ctx,
  ) {
    const space = await toolSpace(ctx);
    await assertNoPrivateQuote(space.id, question);
    if (subproblem_id) await requireSubproblem(space.id, subproblem_id);
    const row = await ask({
      spaceId: space.id,
      question,
      participantIds: participant_ids,
    });
    if (subproblem_id) {
      await setMessageMeta(space.id, row.id, { subproblemId: subproblem_id });
    }
    if (space.status !== "open") return { question_id: row.id };
    const dueAt = await scheduleDeadline(
      space.id,
      row.id,
      deadline_minutes ?? DEFAULT_DEADLINE_MINUTES,
    );
    return { question_id: row.id, deadline: dueAt.toISOString() };
  },
});
