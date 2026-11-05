import { defineTool } from "eve/tools";
import { z } from "zod";
import { findCommonDates } from "@/lib/master/compute/dates";

const range = z.object({
  from: z.string().describe("YYYY-MM-DD"),
  to: z.string().describe("YYYY-MM-DD, inclusive"),
});

export default defineTool({
  description:
    "Find dates that work for everyone. Turn what participants told you about their availability into date ranges, then get every run of at least min_days when all of them are free and, if there is none, the windows most of them can make with who would miss out. Someone with no available ranges counts as free except on their unavailable days.",
  inputSchema: z.object({
    window: range.describe("The period to search, at most 400 days."),
    min_days: z.number().int().min(1).max(60),
    participants: z
      .array(
        z.object({
          participant_id: z.string(),
          available: z
            .array(range)
            .optional()
            .describe("Only these days are possible for them."),
          unavailable: z.array(range).optional(),
        }),
      )
      .min(1),
  }),
  async execute({ window, min_days, participants }) {
    return findCommonDates({
      window,
      minDays: min_days,
      participants: participants.map((p) => ({ ...p, id: p.participant_id })),
    });
  },
});
