import { defineTool } from "eve/tools";
import { z } from "zod";
import { setMessageMeta } from "@/lib/master/meta";
import { requireSubproblem } from "@/lib/master/plan";
import { assertNoPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { propose } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Put one concrete option to a vote, e.g. 'Paris, 12-18 May'. Participants vote yes, no or abstain; tallies appear in your snapshot. One option per proposal. To offer several alternatives at once, use propose_options.",
  inputSchema: z.object({
    proposal: z.string().min(1),
    subproblem_id: z
      .string()
      .optional()
      .describe("The subproblem this proposal decides."),
  }),
  async execute({ proposal, subproblem_id }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open")
      throw new Error("Proposals need an open space.");
    await assertNoPrivateQuote(space.id, proposal);
    if (subproblem_id) await requireSubproblem(space.id, subproblem_id);
    const row = await propose({ spaceId: space.id, proposal });
    if (subproblem_id) {
      await setMessageMeta(space.id, row.id, { subproblemId: subproblem_id });
    }
    return { proposal_id: row.id };
  },
});
