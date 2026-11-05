import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateSubproblem } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Change a subproblem on the dashboard: its status (open, discussing while you work on it, conflict when preferences clash, decided), its decision, or its title.",
  inputSchema: z.object({
    subproblem_id: z.string(),
    status: z.enum(["open", "discussing", "conflict", "decided"]).optional(),
    decision: z
      .string()
      .optional()
      .describe("What was decided, when status is decided."),
    title: z.string().min(1).max(80).optional().describe("A new title."),
  }),
  async execute({ subproblem_id, status, decision, title }, ctx) {
    const space = await toolSpace(ctx);
    return updateSubproblem(space.id, subproblem_id, {
      status,
      decision,
      title,
    });
  },
});
