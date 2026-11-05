import { defineTool } from "eve/tools";
import { z } from "zod";
import { dateInfo } from "@/lib/master/compute/dates";

export default defineTool({
  description:
    "Check a date or a date range before you propose it: weekdays of the first and last day, number of days and nights, weekend and working days. Dates are YYYY-MM-DD.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string().optional().describe("Last day, inclusive."),
  }),
  async execute({ from, to }) {
    return dateInfo({ from, to });
  },
});
