import { defineTool } from "eve/tools";
import { z } from "zod";
import { addSubproblem } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Add a subproblem the group has to decide that wasn't planned, e.g. 'Transport' once the destination is known. It is appended unless before_id puts it in front of another one.",
  inputSchema: z.object({
    title: z.string().min(1).max(80),
    before_id: z.string().optional().describe("Insert before this subproblem."),
  }),
  async execute({ title, before_id }, ctx) {
    const space = await toolSpace(ctx);
    const created = await addSubproblem(space.id, title, before_id);
    return { subproblem_id: created.id };
  },
});
