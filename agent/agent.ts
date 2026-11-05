import { xai } from "@ai-sdk/xai";
import { defineAgent } from "eve";

// The Master runs on Grok through the xAI API. `xai()` reads XAI_API_KEY.
// XAI_MODEL overrides the model id without a code change.
export default defineAgent({
  model: xai(process.env.XAI_MODEL ?? "grok-4.7"),
  reasoning: "medium",
});
