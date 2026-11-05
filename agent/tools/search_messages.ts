import { defineTool } from "eve/tools";
import { z } from "zod";
import { messageKind } from "@/db/schema";
import { searchMessages } from "@/lib/master/lookup";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Search the whole space history, e.g. everything someone said about 'budget', or all of one participant's messages. Filters combine. Returns the newest matches, oldest first.",
  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .optional()
      .describe("Text the message contains, case-insensitive."),
    participant_id: z
      .string()
      .optional()
      .describe("Only messages from this participant."),
    from_master: z.boolean().optional().describe("Only your own messages."),
    kind: z.enum(messageKind.enumValues).optional(),
    limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
  }),
  async execute(input, ctx) {
    const space = await toolSpace(ctx);
    return searchMessages(space.id, {
      query: input.query,
      participantId: input.participant_id,
      fromMaster: input.from_master,
      kind: input.kind,
      limit: input.limit ?? 20,
    });
  },
});
