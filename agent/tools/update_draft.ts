import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateDraft } from "@/lib/master/draft";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Shape the draft while the space is still a draft: title, goal, description, subproblems (titles, in order) and constraints. Send only the fields you change; lists replace the previous list.",
  inputSchema: z.object({
    title: z.string().min(1).max(80).optional(),
    goal: z.string().min(1).optional(),
    description: z.string().optional(),
    subproblems: z.array(z.string().min(1)).optional(),
    constraints: z.array(z.string().min(1)).optional(),
  }),
  async execute(patch, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "draft") {
      throw new Error(
        "The space is open. The goal can only change through the initiator.",
      );
    }
    await updateDraft(space.id, patch);
    return { updated: Object.keys(patch) };
  },
});
