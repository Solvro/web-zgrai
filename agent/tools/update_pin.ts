import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { updatePin } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Edit a pin in place when its fact changed, e.g. the budget went from 800 to 900 PLN, instead of unpinning and pinning again.",
  inputSchema: z.object({
    item_id: z.string(),
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
  }),
  async execute({ item_id, title, content }, ctx) {
    const space = await toolSpace(ctx);
    if (!title && !content) throw new Error("Pass a new title or content.");
    await updatePin(space.id, item_id, {
      ...(title ? { title } : {}),
      ...(content ? { content } : {}),
    });
    return { updated: item_id };
  },
});
