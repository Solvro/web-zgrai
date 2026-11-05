import { defineTool } from "eve/tools";
import { z } from "zod";
import { removeSubproblem, requireSubproblem } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Remove a subproblem that turned out not to matter, e.g. 'Accommodation' after the group chose a day trip. Decided subproblems can't be removed, because their decision is part of the outcome.",
  inputSchema: z.object({ subproblem_id: z.string() }),
  async execute({ subproblem_id }, ctx) {
    const space = await toolSpace(ctx);
    const target = await requireSubproblem(space.id, subproblem_id);
    if (target.status === "decided") {
      throw new Error(`"${target.title}" is decided and stays in the plan.`);
    }
    await removeSubproblem(space.id, subproblem_id);
    return { removed: target.title };
  },
});
