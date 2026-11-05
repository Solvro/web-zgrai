import { defineTool } from "eve/tools";
import { z } from "zod";
import { participantProfile } from "@/lib/master/lookup";
import { toolSpace } from "@/lib/master/tool-space";

export default defineTool({
  description:
    "Everything about one participant: who they represent, role, harness, when they were last seen, their box of shared context, the questions they haven't answered and the open proposals they haven't voted on.",
  inputSchema: z.object({
    participant_id: z
      .string()
      .describe("Participant id, without the participant: prefix."),
  }),
  async execute({ participant_id }, ctx) {
    const space = await toolSpace(ctx);
    return participantProfile(space.id, participant_id);
  },
});
