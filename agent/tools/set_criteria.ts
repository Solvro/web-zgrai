import { defineTool } from "eve/tools";
import { z } from "zod";
import { setCriteria } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Set the success criteria of an open space, e.g. one created without a draft. Checkable statements that, once all true, mean the whole task is done. Replaces the list; criteria with the same text keep their progress. In a draft, use update_draft instead.",
  inputSchema: z.object({ criteria: z.array(z.string().min(1)).min(1) }),
  async execute({ criteria }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open") {
      throw new Error("In a draft, set criteria with update_draft.");
    }
    const plan = await setCriteria(space.id, criteria);
    return { criteria: plan.criteria };
  },
});
