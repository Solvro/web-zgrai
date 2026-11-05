import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { scheduleReminder } from "@/lib/master/wake";

export default defineTool({
  description:
    "Wake yourself up later, even if nobody says anything, e.g. to close a vote at a set time or to check whether someone came back. You get a <reminder> event with your note. Nobody else sees it.",
  inputSchema: z.object({
    minutes: z
      .number()
      .int()
      .min(1)
      .max(7 * 24 * 60),
    note: z
      .string()
      .min(1)
      .describe("What to do when it fires, written for your future self."),
  }),
  async execute({ minutes, note }, ctx) {
    const space = await toolSpace(ctx);
    const row = await scheduleReminder(space.id, minutes, note);
    return { reminder_id: row.id, due: row.dueAt.toISOString() };
  },
});
