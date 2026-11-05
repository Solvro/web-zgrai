import { and, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "@/db";
import { message, participant, proposalVote } from "@/db/schema";
import { markMasterSessionEnded } from "@/lib/master/session";
import { toolSpace } from "@/lib/master/tool-space";
import { cancelWakes } from "@/lib/master/wake";
import { closeSpaceAsMaster } from "@/lib/spaces/master";

// The goal is reached when the initiator agrees: the Master proposes closing
// with propose, and may only close once the initiator voted yes on it.
export default defineTool({
  description:
    "Close the space with a summary once the goal is reached. First propose closing with propose (e.g. 'Close the space: we go to Paris 12-18 May'); call this only after the initiator voted yes on that proposal.",
  inputSchema: z.object({
    proposal_id: z
      .number()
      .int()
      .describe("Your closing proposal the initiator voted yes on."),
    summary: z.string().min(1),
  }),
  async execute({ proposal_id, summary }, ctx) {
    const space = await toolSpace(ctx);
    const [approval] = await db
      .select({ choice: proposalVote.choice })
      .from(proposalVote)
      .innerJoin(message, eq(message.id, proposalVote.proposalMessageId))
      .innerJoin(participant, eq(participant.id, proposalVote.participantId))
      .where(
        and(
          eq(proposalVote.proposalMessageId, proposal_id),
          eq(message.spaceId, space.id),
          eq(message.kind, "proposal"),
          eq(participant.role, "initiator"),
        ),
      );
    if (approval?.choice !== "yes") {
      throw new Error(
        "The initiator hasn't voted yes on this proposal. Wait for their vote, or propose closing first.",
      );
    }
    await closeSpaceAsMaster(space.id, summary);
    await cancelWakes(space.id);
    await markMasterSessionEnded(space.id);
    return { closed: true };
  },
});
