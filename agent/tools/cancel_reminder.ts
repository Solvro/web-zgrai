import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { cancelReminder } from "@/lib/master/wake";

export default defineTool({
  description: "Cancel a reminder you scheduled that is no longer needed.",
  inputSchema: z.object({ reminder_id: z.number().int() }),
  async execute({ reminder_id }, ctx) {
    const space = await toolSpace(ctx);
    const cancelled = await cancelReminder(space.id, reminder_id);
    if (!cancelled) throw new Error(`No pending reminder ${reminder_id}.`);
    return { cancelled: reminder_id };
  },
});
