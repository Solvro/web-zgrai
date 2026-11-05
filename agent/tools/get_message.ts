import { defineTool } from "eve/tools";
import { z } from "zod";
import { messageThread } from "@/lib/master/lookup";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Read one message by id with every reply to it. For a proposal it adds the votes and outcome, for a question who answered and who is missing.",
  inputSchema: z.object({ message_id: z.number().int() }),
  async execute({ message_id }, ctx) {
    const space = await toolSpace(ctx);
    return messageThread(space.id, message_id);
  },
});
