import { defineTool } from "eve/tools";
import { z } from "zod";
import { addConstraint } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Add a hard constraint to the plan that every option must respect, e.g. 'Back by 18 May' or 'Max 800 PLN per person'. Pin it as well if everyone should see it at the top of the dashboard.",
  inputSchema: z.object({ constraint: z.string().min(1).max(200) }),
  async execute({ constraint }, ctx) {
    const space = await toolSpace(ctx);
    return { constraints: await addConstraint(space.id, constraint) };
  },
});
