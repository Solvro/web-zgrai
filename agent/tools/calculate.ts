import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CALCULATOR_FUNCTIONS,
  calculate,
} from "@/lib/master/compute/calculator";

export default defineTool({
  description: `Evaluate arithmetic exactly instead of doing it in your head, e.g. budgets and splits: '(4 * 220 + 90) / 5'. Supports + - * / % ^, parentheses and ${CALCULATOR_FUNCTIONS.join(", ")}. round(x, 2) rounds to 2 decimals.`,
  inputSchema: z.object({ expression: z.string().min(1).max(500) }),
  async execute({ expression }) {
    return { expression, result: calculate(expression) };
  },
});
