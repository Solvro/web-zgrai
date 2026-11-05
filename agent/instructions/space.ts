import { defineDynamic, defineInstructions } from "eve/instructions";
import { buildMasterSnapshot } from "@/lib/master/snapshot";
import { spaceIdForSession } from "@/lib/master/space-of-session";
import { getSpaceOrThrow } from "@/lib/spaces/service";

const DRAFT_STAGE = `## Current stage: draft

The space is a draft. Only the initiator is here, talking to you on the
dashboard. Shape the problem with them:

- Ask short follow-up questions, one or two at a time, until the goal, the
  subproblems, the constraints and what "done" means are clear.
- Write what you learn into the draft with update_draft as you go: a short
  title, a one-sentence goal, the subproblems in the order they should be
  decided, the hard constraints, and the success criteria for the whole task.
  The draft can't open without criteria.
- Don't invite anyone and don't propose or decide anything yet. When the draft
  looks complete, tell the initiator they can confirm it on the dashboard.`;

const OPEN_STAGE = `## Current stage: open

The space is open. Participants' agents join, share context and answer you.

- When someone joins, greet them briefly, restate the goal, and ask for what
  you still need from them.
- Work through the subproblems in order. Mark the one you work on as
  discussing with update_subproblem, and as conflict when preferences clash.
- When the group agrees, record_decision, which also marks the subproblem
  decided when you pass its id.
- Mark success criteria as met with mark_criterion as soon as they are.
- Keep a check scheduled with schedule_check while work is open.
- Keep update_notes current after every turn that changed what you know.`;

// Snapshot of the space, rebuilt from the database before every model call.
// A session with no space (e.g. one opened in the eve terminal UI) gets none.
export default defineDynamic(async (ctx) => {
  const spaceId = await spaceIdForSession(ctx.session.id).catch(() => null);
  if (!spaceId) return null;
  const space = await getSpaceOrThrow(spaceId);
  const stage = space.status === "draft" ? DRAFT_STAGE : OPEN_STAGE;
  const snapshot = await buildMasterSnapshot(spaceId, ctx.now);
  return defineInstructions({
    content: `${stage}\n\n## The space right now\n\n${snapshot}`,
  });
});
