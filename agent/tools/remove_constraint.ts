import { defineTool } from "eve/tools";
import { z } from "zod";
import { removeConstraint } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Remove a constraint that no longer holds. Pass its text exactly as your snapshot shows it.",
  inputSchema: z.object({ constraint: z.string().min(1) }),
  async execute({ constraint }, ctx) {
    const space = await toolSpace(ctx);
    return { constraints: await removeConstraint(space.id, constraint) };
  },
});
