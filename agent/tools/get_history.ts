import { defineTool } from "eve/tools";
import { z } from "zod";
import { messageHistory } from "@/lib/master/lookup";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Read older messages of the space, oldest first, signed like your snapshot. The snapshot only shows the latest 30. Pass the returned before to page further back.",
  inputSchema: z.object({
    before: z
      .number()
      .int()
      .optional()
      .describe("Only messages with an id below this one."),
    limit: z.number().int().min(1).max(100).optional().describe("Default 30."),
  }),
  async execute({ before, limit }, ctx) {
    const space = await toolSpace(ctx);
    return messageHistory(space.id, { before, limit: limit ?? 30 });
  },
});
