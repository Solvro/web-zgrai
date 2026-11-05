import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { message, participant, proposalVote } from "@/db/schema";
import { getBoard, getMasterContext } from "@/lib/spaces/master";
import { finalPlanApproval } from "./final-plan";
import { getPlan } from "./plan";
import { activeCheck, pendingDeadlines } from "./wake";

const RECENT_MESSAGES = 30;
const RECENT_PROPOSALS = 10;

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function recentWindowStart(spaceId: string) {
  const rows = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.spaceId, spaceId))
    .orderBy(desc(message.id))
    .limit(RECENT_MESSAGES);
  const oldest = rows.at(-1)?.id;
  return oldest ? oldest - 1 : 0;
}

async function proposalsBlock(spaceId: string) {
  const proposals = await db
    .select()
    .from(message)
    .where(and(eq(message.spaceId, spaceId), eq(message.kind, "proposal")))
    .orderBy(desc(message.id))
    .limit(RECENT_PROPOSALS);
  if (proposals.length === 0) return "<proposals/>";
  const votes = await db
    .select({
      proposalId: proposalVote.proposalMessageId,
      choice: proposalVote.choice,
      comment: proposalVote.comment,
      participantId: participant.id,
      represents: participant.represents,
    })
    .from(proposalVote)
    .innerJoin(participant, eq(participant.id, proposalVote.participantId))
    .where(
      inArray(
        proposalVote.proposalMessageId,
        proposals.map((p) => p.id),
      ),
    );
  const lines = proposals.reverse().map((p) => {
    const mine = votes.filter((v) => v.proposalId === p.id);
    const tally = { yes: 0, no: 0, abstain: 0 };
    for (const v of mine) tally[v.choice] += 1;
    const voters = mine
      .map(
        (v) =>
          `    <vote from="participant:${v.participantId}" represents="${esc(v.represents)}" choice="${v.choice}">${esc(v.comment ?? "")}</vote>`,
      )
      .join("\n");
    return `  <proposal id="${p.id}" yes="${tally.yes}" no="${tally.no}" abstain="${tally.abstain}">\n    ${esc(p.content)}\n${voters}\n  </proposal>`;
  });
  return `<proposals>\n${lines.join("\n")}\n</proposals>`;
}

// Everything the Master needs to know about the space, read fresh from the
// database before every model call. Decisions live here, not in the model's
// history, so a compaction can never make the Master forget one.
// `now` comes from the caller (eve's ctx.now), so the same events always
// produce the same snapshot.
export async function buildMasterSnapshot(spaceId: string, now: Date) {
  const context = await getMasterContext(
    spaceId,
    await recentWindowStart(spaceId),
  );
  const { space } = context;
  const plan = await getPlan(spaceId);
  const check = await activeCheck(spaceId);
  const approval = await finalPlanApproval(spaceId);
  const criteria = plan.criteria
    .map(
      (c) =>
        `  <criterion id="${c.id}" met="${c.met}"${c.evidence ? ` evidence="${esc(c.evidence)}"` : ""}>${esc(c.text)}</criterion>`,
    )
    .join("\n");
  const checkLine = check
    ? `<scheduled_check every_minutes="${check.everyMinutes}" next="${check.dueAt.toISOString()}">${esc(check.reason ?? "")}</scheduled_check>`
    : "<scheduled_check/>";
  const people = (list: { id: string; represents: string }[]) =>
    list.map((p) => `participant:${p.id} (${esc(p.represents)})`).join(", ");
  const finalPlan = approval
    ? `<final_plan proposal_id="${approval.proposal.id}" approved_by="${people(approval.approvedBy)}" waiting_for="${people(approval.waitingFor)}" not_approving="${people(approval.notApproving)}"/>`
    : "<final_plan/>";
  const board = await getBoard(spaceId);
  const deadlines = await pendingDeadlines(spaceId);

  const participants = context.participants
    .map(
      (p) =>
        `  <participant id="participant:${p.participant_id}" represents="${esc(p.represents)}" role="${p.role}" harness="${esc(p.harness ?? "unknown")}"/>`,
    )
    .join("\n");
  const subproblems = plan.subproblems
    .map(
      (s) =>
        `  <subproblem id="${s.id}" status="${s.status}"${s.decision ? ` decision="${esc(s.decision)}"` : ""}>${esc(s.title)}</subproblem>`,
    )
    .join("\n");
  const constraints = plan.constraints
    .map((c) => `  <constraint>${esc(c)}</constraint>`)
    .join("\n");
  const notes = board.find((item) => item.kind === "note");
  const pins = board
    .filter((item) => item.kind === "pin")
    .map(
      (item) =>
        `  <pin id="${item.id}" title="${esc(item.title ?? "")}">${esc(item.content)}</pin>`,
    )
    .join("\n");
  const pending = deadlines
    .map(
      (d) =>
        `  <deadline question_id="${d.questionId}" due="${d.dueAt.toISOString()}"/>`,
    )
    .join("\n");

  return [
    `<space id="${space.id}" status="${space.status}" now="${now.toISOString()}">`,
    `<title>${esc(space.title)}</title>`,
    `<goal>${esc(space.goal || "(not set yet)")}</goal>`,
    space.description
      ? `<description>${esc(space.description)}</description>`
      : "",
    space.deadline
      ? `<space_deadline>${space.deadline.toISOString()}</space_deadline>`
      : "",
    `<participants>\n${participants}\n</participants>`,
    `<subproblems>\n${subproblems}\n</subproblems>`,
    `<constraints>\n${constraints}\n</constraints>`,
    `<success_criteria>\n${criteria}\n</success_criteria>`,
    finalPlan,
    checkLine,
    `<notes>${esc(notes?.content ?? "")}</notes>`,
    `<pins>\n${pins}\n</pins>`,
    await proposalsBlock(spaceId),
    `<open_questions>\n${pending}\n</open_questions>`,
    `<boxes>\n${context.boxes}\n</boxes>`,
    `<recent_messages>\n${context.transcript}\n</recent_messages>`,
    "</space>",
  ]
    .filter(Boolean)
    .join("\n");
}
