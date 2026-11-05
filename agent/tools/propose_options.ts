import { defineTool } from "eve/tools";
import { z } from "zod";
import { setMessageMeta } from "@/lib/master/meta";
import { requireSubproblem } from "@/lib/master/plan";
import { assertNoPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { postMasterMessage, propose } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Offer 2-6 alternatives for one subproblem at once, e.g. three places to stay. Posts a short intro and one proposal per option, each answering the intro. Participants vote yes on every option they would accept, so the option with the most yes votes and a majority wins.",
  inputSchema: z.object({
    intro: z
      .string()
      .min(1)
      .describe(
        "One line explaining the choice, e.g. 'Where do we stay? Vote yes on every option you'd accept.'",
      ),
    options: z.array(z.string().min(1)).min(2).max(6),
    subproblem_id: z.string().optional(),
  }),
  async execute({ intro, options, subproblem_id }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open")
      throw new Error("Proposals need an open space.");
    await assertNoPrivateQuote(space.id, [intro, ...options].join("\n"));
    if (subproblem_id) await requireSubproblem(space.id, subproblem_id);

    const lead = await postMasterMessage({ spaceId: space.id, text: intro });
    const proposals = [];
    for (const option of options) {
      const row = await propose({
        spaceId: space.id,
        proposal: option,
        replyTo: lead.id,
      });
      if (subproblem_id) {
        await setMessageMeta(space.id, row.id, { subproblemId: subproblem_id });
      }
      proposals.push({ proposal_id: row.id, option });
    }
    return { intro_message_id: lead.id, proposals };
  },
});
