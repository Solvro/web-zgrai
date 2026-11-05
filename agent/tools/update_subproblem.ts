import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateSubproblem } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Change a subproblem's status on the dashboard: open, discussing (you are working on it), conflict (preferences clash) or decided.",
  inputSchema: z.object({
    subproblem_id: z.string(),
    status: z.enum(["open", "discussing", "conflict", "decided"]),
    decision: z
      .string()
      .optional()
      .describe("What was decided, when status is decided."),
  }),
  async execute({ subproblem_id, status, decision }, ctx) {
    const space = await toolSpace(ctx);
    return updateSubproblem(space.id, subproblem_id, { status, decision });
  },
});
