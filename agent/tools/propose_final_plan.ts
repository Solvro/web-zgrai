import { defineTool } from "eve/tools";
import { z } from "zod";
import { findPrivateQuote } from "@/lib/master/privacy";
import { getPlan, setFinalProposal, unmetCriteria } from "@/lib/master/plan";
import { toolSpace } from "@/lib/master/tool-space";
import { propose } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Once every success criterion is met, give everyone the final plan to approve. Every active participant votes on it; when all vote yes the space ends with this plan as its summary. If someone votes no, fix the plan and propose it again: the new one replaces the old.",
  inputSchema: z.object({
    plan: z
      .string()
      .min(1)
      .describe(
        "The complete plan: every decision, who does what, dates and costs.",
      ),
  }),
  async execute({ plan }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open") {
      throw new Error("The final plan needs an open space.");
    }
    const current = await getPlan(space.id);
    if (current.criteria.length === 0) {
      throw new Error("Set the success criteria first with set_criteria.");
    }
    const unmet = unmetCriteria(current);
    if (unmet.length > 0) {
      throw new Error(
        `These criteria aren't met yet: ${unmet.map((c) => `${c.id} (${c.text})`).join("; ")}.`,
      );
    }
    const quoted = await findPrivateQuote(space.id, plan);
    if (quoted) {
      throw new Error(
        `This repeats a participant's private note ("${quoted}"). Rephrase without revealing it.`,
      );
    }
    const row = await propose({
      spaceId: space.id,
      proposal: `Final plan, approve to finish the space:\n\n${plan}`,
    });
    await setFinalProposal(space.id, row.id);
    return { proposal_id: row.id };
  },
});
