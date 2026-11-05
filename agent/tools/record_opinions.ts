import { defineTool } from "eve/tools";
import { z } from "zod";
import { recordOpinions } from "@/lib/master/plan";
import { findPrivateQuote } from "@/lib/master/privacy";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Record where participants stand on a step, in a few words each, e.g. 'Up to 900 zł' or 'Apr 30 – May 4'. Everyone sees these on the dashboard's step summary. Later calls overwrite a participant's earlier opinion on the same step.",
  inputSchema: z.object({
    subproblem_id: z.string(),
    opinions: z
      .array(
        z.object({
          participant_id: z
            .string()
            .describe("Participant id, without the participant: prefix."),
          opinion: z.string().min(1).max(120),
        }),
      )
      .min(1),
  }),
  async execute({ subproblem_id, opinions }, ctx) {
    const space = await toolSpace(ctx);
    for (const entry of opinions) {
      const quoted = await findPrivateQuote(space.id, entry.opinion);
      if (quoted) {
        throw new Error(
          `This repeats a participant's private note ("${quoted}"). Rephrase without revealing it.`,
        );
      }
    }
    return recordOpinions(
      space.id,
      subproblem_id,
      opinions.map((o) => ({
        participantId: o.participant_id,
        opinion: o.opinion,
      })),
    );
  },
});
