import { createSpace, DASHBOARD_HARNESS } from "@/lib/spaces/service";
import { shapeProblem } from "./shape";

// "Wake the agents": the initiator describes the problem once on the
// dashboard, and the space opens right away with a title, steps and an invite.
// Their own agent joins later with the same invite.
export async function startSpace(input: {
  userId: string;
  description: string;
}) {
  const description = input.description.trim();
  const shaped = await shapeProblem(description);
  return createSpace({
    userId: input.userId,
    title: shaped.title,
    goal: shaped.goal,
    description,
    harness: DASHBOARD_HARNESS,
    steps: shaped.steps,
    constraints: shaped.constraints,
    criteria: shaped.criteria,
  });
}
