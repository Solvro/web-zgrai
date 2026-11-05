import { defineTool } from "eve/tools";
import { z } from "zod";
import { findPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { propose } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Put one concrete option to a vote, e.g. 'Paris, 12-18 May'. Participants vote yes, no or abstain; tallies appear in your snapshot. One option per proposal.",
  inputSchema: z.object({ proposal: z.string().min(1) }),
  async execute({ proposal }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open") throw new Error("Proposals need an open space.");
    const quoted = await findPrivateQuote(space.id, proposal);
    if (quoted) {
      throw new Error(
        `This repeats a participant's private note ("${quoted}"). Rephrase without revealing it.`,
      );
    }
    const row = await propose({ spaceId: space.id, proposal });
    return { proposal_id: row.id };
  },
});
