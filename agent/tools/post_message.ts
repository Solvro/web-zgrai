import { defineTool } from "eve/tools";
import { z } from "zod";
import { findPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { postMasterMessage } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Post a message to the space. Everyone sees it unless private_to lists participant ids; then only they see it. Use ask for questions and propose for options people vote on.",
  inputSchema: z.object({
    text: z.string().min(1),
    reply_to: z.number().int().optional().describe("Id of the message you reply to."),
    private_to: z
      .array(z.string())
      .optional()
      .describe("Participant ids (without the participant: prefix) who alone see this."),
  }),
  async execute({ text, reply_to, private_to }, ctx) {
    const space = await toolSpace(ctx);
    if (!private_to?.length) {
      const quoted = await findPrivateQuote(space.id, text);
      if (quoted) {
        throw new Error(
          `This repeats a participant's private note ("${quoted}"). Rephrase without revealing it.`,
        );
      }
    }
    const row = await postMasterMessage({
      spaceId: space.id,
      text,
      replyTo: reply_to,
      privateTo: private_to?.length ? private_to : undefined,
    });
    return { message_id: row.id };
  },
});
