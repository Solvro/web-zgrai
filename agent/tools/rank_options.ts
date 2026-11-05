import { defineTool } from "eve/tools";
import { z } from "zod";
import { rankOptions } from "@/lib/master/compute/ranking";

export default defineTool({
  description:
    "Count ranked preferences when a yes/no vote doesn't settle a choice between several options. Pass each participant's ranking, best first, as they told you. Returns Borda scores and first choices, the Condorcet winner (beats every other option head to head) and an instant-runoff count. Use the result to propose the fairest option; it doesn't decide anything by itself.",
  inputSchema: z.object({
    ballots: z
      .array(
        z.object({
          participant_id: z.string(),
          ranking: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(1),
    options: z
      .array(z.string().min(1))
      .optional()
      .describe("Every option, including ones nobody ranked."),
  }),
  async execute({ ballots, options }) {
    const voters = ballots.map((b) => b.participant_id);
    const twice = voters.find((id, i) => voters.indexOf(id) !== i);
    if (twice) throw new Error(`Participant ${twice} has two ballots.`);
    return rankOptions(
      ballots.map((b) => b.ranking),
      options,
    );
  },
});
