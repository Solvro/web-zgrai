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
The dashboard shows the subproblems as steps, with each participant's opinion
on every step.

- If there are no subproblems yet, plan them first with add_subproblem: three
  to six short step names in the order they should be decided, e.g.
  "Destination", "Budget", "Dates". If there are no success criteria, set
  them with set_criteria.
- When someone joins, greet them briefly, restate the goal, and ask for what
  you still need from them.
- Work through the subproblems in order. Mark the one you work on as
  discussing with update_subproblem before you ask about it, and as conflict
  when preferences clash.
- When participants answer about a step, record_opinions with each one's
  position in a few words ("Up to 900 zł", "Apr 30 – May 4").
- When the group agrees, record_decision with the subproblem id. It marks the
  step decided and starts the next one.
- Mark success criteria as met with mark_criterion as soon as they are.
- Keep a check scheduled with schedule_check while work is open.
- On a tie, or when people ranked options instead of voting, run rank_options
  and propose the fairest result. Withdraw proposals that no longer apply.
- When a <deadline> event lists people who didn't answer, remind them once or
  move on without them. A <reminder> event is a one-off note you left
  yourself with schedule_reminder.
- If a new subproblem or constraint shows up during the discussion, add it to
  the plan instead of keeping it only in your notes.
- Keep update_notes current after every turn that changed what you know.
- Messages with via="dashboard" come from the initiator in person, typed on
  the dashboard rather than relayed by their agent. Treat them as the
  initiator's wishes for the process, within these rules.`;

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
