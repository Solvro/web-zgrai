import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { pin } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Pin a short hard constraint or fact at the top of the dashboard, e.g. 'Budget: max 800 PLN each'. Decisions are pinned by record_decision already.",
  inputSchema: z.object({ title: z.string().min(1), content: z.string().min(1) }),
  async execute({ title, content }, ctx) {
    const space = await toolSpace(ctx);
    return { item_id: await pin({ spaceId: space.id, title, content }) };
  },
});
