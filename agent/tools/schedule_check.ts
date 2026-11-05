import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolSpace } from "@/lib/master/tool-space";
import {
  CHECK_MAX_MINUTES,
  CHECK_MIN_MINUTES,
  scheduleCheck,
} from "@/lib/master/wake";

export default defineTool({
  description: `Wake yourself up every few minutes, even when nobody writes, to review the success criteria and stages and push the space forward. Pick the interval from how fast things move: short while people are actively answering, long while you wait on something slow. Replaces your previous check. Runs until cancel_check or the space ends.`,
  inputSchema: z.object({
    every_minutes: z
      .number()
      .int()
      .min(CHECK_MIN_MINUTES)
      .max(CHECK_MAX_MINUTES),
    reason: z
      .string()
      .min(1)
      .describe("What you want to check, e.g. 'see if everyone voted on dates'."),
  }),
  async execute({ every_minutes, reason }, ctx) {
    const space = await toolSpace(ctx);
    if (space.status !== "open") {
      throw new Error("Checks need an open space.");
    }
    const next = await scheduleCheck(space.id, every_minutes, reason);
    return { every_minutes, next_check: next.toISOString() };
  },
});
