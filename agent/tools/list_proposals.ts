import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import { getProposalDetails, PROPOSAL_OUTCOMES } from "@/lib/master/votes";

export default defineTool({
  description:
    "List proposals with tallies, every vote and comment, who hasn't voted, and the outcome under the majority rule: passed or rejected once the remaining voters can't change it, tie when everyone voted and yes equals no, otherwise pending. Your snapshot only has the latest 10.",
  inputSchema: z.object({
    proposal_ids: z.array(z.number().int()).optional(),
    outcome: z.enum(PROPOSAL_OUTCOMES).optional(),
    subproblem_id: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
  }),
  async execute({ proposal_ids, outcome, subproblem_id, limit }, ctx) {
    const space = await toolSpace(ctx);
    const proposals = await getProposalDetails(space.id, {
      ids: proposal_ids,
      limit: outcome || subproblem_id ? 100 : (limit ?? 20),
    });
    return {
      proposals: proposals
        .filter((p) => !outcome || p.outcome === outcome)
        .filter((p) => !subproblem_id || p.subproblem_id === subproblem_id)
        .slice(-(limit ?? 20)),
    };
  },
});
