import { defineTool } from "eve/tools";
import { z } from "zod";
import { activityType } from "@/db/schema";
import { activityLog } from "@/lib/master/lookup";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Read the space's activity log: joins, votes, shared and withdrawn context, leaves. The same one-line entries the dashboard's live chat shows.",
  inputSchema: z.object({
    after: z
      .number()
      .int()
      .optional()
      .describe("Only entries with an id above this one."),
    types: z.array(z.enum(activityType.enumValues)).optional(),
    limit: z.number().int().min(1).max(100).optional().describe("Default 30."),
  }),
  async execute({ after, types, limit }, ctx) {
    const space = await toolSpace(ctx);
    return {
      entries: await activityLog(space.id, {
        after,
        types,
        limit: limit ?? 30,
      }),
    };
  },
});
