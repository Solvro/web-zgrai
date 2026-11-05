import { defineTool } from "eve/tools";
import { z } from "zod";
import { setMessageMeta } from "@/lib/master/meta";
import { assertNoPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";
import { getProposalOrThrow } from "@/lib/master/votes";
import { postMasterMessage } from "@/lib/spaces/master";

export default defineTool({
  description:
    "Withdraw one of your proposals that no longer applies, e.g. the hotel is sold out or a better compromise replaced it. Announces it with the reason; its votes stop counting.",
  inputSchema: z.object({
    proposal_id: z.number().int(),
    reason: z.string().min(1),
  }),
  async execute({ proposal_id, reason }, ctx) {
    const space = await toolSpace(ctx);
    const proposal = await getProposalOrThrow(space.id, proposal_id);
    if (proposal.withdrawn) return { already_withdrawn: true };
    await assertNoPrivateQuote(space.id, reason);
    await setMessageMeta(space.id, proposal_id, {
      withdrawnAt: new Date(),
      withdrawReason: reason,
    });
    const row = await postMasterMessage({
      spaceId: space.id,
      text: `Withdrawn: "${proposal.content}". ${reason}`,
      replyTo: proposal_id,
    });
    return { message_id: row.id };
  },
});
