import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateSubproblem } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";
import { recordDecision } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Record a decision the group reached, e.g. title 'Destination', content 'Paris'. It is announced and pinned. Pass subproblem_id to mark that subproblem decided.",
  inputSchema: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    subproblem_id: z.string().optional(),
  }),
  async execute({ title, content, subproblem_id }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open")
      throw new Error("Decisions need an open space.");
    const row = await recordDecision({ spaceId: space.id, title, content });
    if (subproblem_id) {
      await updateSubproblem(space.id, subproblem_id, {
        status: "decided",
        decision: content,
      });
    }
    return { message_id: row.id };
  },
});
