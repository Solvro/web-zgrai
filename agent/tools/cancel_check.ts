import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { cancelChecks } from "@/lib/master/wake";

export default defineTool({
  description:
    "Stop your scheduled check, e.g. when you only wait for the final votes.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const space = await toolSpace(ctx);
    await cancelChecks(space.id);
    return { cancelled: true };
  },
});
