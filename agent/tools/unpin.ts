import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { unpin } from "@/lib/spaces/master";

export default defineTool({
  description: "Remove a pin from the dashboard, e.g. when a constraint no longer holds.",
  inputSchema: z.object({ item_id: z.string() }),
  async execute({ item_id }, ctx) {
    const space = await toolSpace(ctx);
    await unpin(space.id, item_id);
    return { removed: item_id };
  },
});
