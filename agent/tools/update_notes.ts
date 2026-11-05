import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { updateNotes } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Rewrite your working notes on the dashboard: what is known, what is missing, which conflicts are open. Replaces the previous notes, so always send the full text.",
  inputSchema: z.object({ content: z.string().min(1) }),
  async execute({ content }, ctx) {
    const space = await toolSpace(ctx);
    return { item_id: await updateNotes(space.id, content) };
  },
});
