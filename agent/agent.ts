import { xai } from "@ai-sdk/xai";
import { defineAgent } from "eve";

// The Master runs on Grok through the xAI API. `xai()` reads XAI_API_KEY.
// XAI_MODEL overrides the model id without a code change.
// defaultTools: false drops bash, file, web and subagent tools. The Master
// reads untrusted participant text, so it only gets the space tools in
// agent/tools.
//
// MASTER_TOKEN_BUDGET caps the new input tokens (cache reads excluded) a space
// may spend per budget window. At the cap eve pauses the session and
// src/lib/master/budget.ts hands the decision to the initiator.
const tokenBudget = Number(process.env.MASTER_TOKEN_BUDGET ?? 2_000_000);

export default defineAgent({
  model: xai(process.env.XAI_MODEL ?? "grok-4.7"),
  reasoning: "medium",
  defaultTools: false,
  limits: {
    sessionUsage: ({ window }) =>
      window.inputTokens - window.cacheReadTokens >= tokenBudget,
  },
});
