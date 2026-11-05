import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { message } from "@/db/schema";
import { getBoard, getMasterContext } from "@/lib/spaces/master";
import { finalPlanApproval } from "./final-plan";
import { getPlan } from "./plan";
import { getQuestionStatuses } from "./questions";
import { getProposalDetails } from "./votes";
import { activeCheck, pendingReminders } from "./wake";

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

function ids(people: { participant_id: string }[]) {
  return people.map((p) => p.participant_id).join(",");
}

async function proposalsBlock(spaceId: string) {
  const proposals = await getProposalDetails(spaceId, {
    limit: RECENT_PROPOSALS,
  });
  if (proposals.length === 0) return "<proposals/>";
  const lines = proposals.map((p) => {
    const attrs = [
      `id="${p.proposal_id}"`,
      `outcome="${p.outcome}"`,
      `yes="${p.tally.yes}" no="${p.tally.no}" abstain="${p.tally.abstain}"`,
      p.not_voted.length ? `not_voted="${ids(p.not_voted)}"` : null,
      p.subproblem_id ? `subproblem="${p.subproblem_id}"` : null,
    ]
      .filter(Boolean)
      .join(" ");
    const voters = p.votes
      .map(
        (v) =>
          `    <vote from="participant:${v.participant_id}" represents="${esc(v.represents)}" choice="${v.choice}">${esc(v.comment ?? "")}</vote>`,
      )
      .join("\n");
    return `  <proposal ${attrs}>\n    ${esc(p.content)}\n${voters}\n  </proposal>`;
  });
  return `<proposals>\n${lines.join("\n")}\n</proposals>`;
}

async function openQuestionsBlock(spaceId: string) {
  const waiting = (await getQuestionStatuses(spaceId, { limit: 30 })).filter(
    (q) => q.waiting,
  );
  if (waiting.length === 0) return "<open_questions/>";
  const lines = waiting.map(
    (q) =>
      `  <question id="${q.question_id}" due="${q.deadline}" missing="${ids(q.missing)}">${esc(q.question)}</question>`,
  );
  return `<open_questions>\n${lines.join("\n")}\n</open_questions>`;
}

async function remindersBlock(spaceId: string) {
  const reminders = await pendingReminders(spaceId);
  if (reminders.length === 0) return "<reminders/>";
  const lines = reminders.map(
    (r) =>
      `  <reminder id="${r.id}" due="${r.dueAt.toISOString()}">${esc(r.note ?? "")}</reminder>`,
  );
  return `<reminders>\n${lines.join("\n")}\n</reminders>`;
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

  const participants = context.participants
    .map(
      (p) =>
        `  <participant id="participant:${p.participant_id}" represents="${esc(p.represents)}" role="${p.role}" harness="${esc(p.harness ?? "unknown")}" last_seen="${p.last_seen_at.toISOString()}"/>`,
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
    await openQuestionsBlock(spaceId),
    await remindersBlock(spaceId),
    `<boxes>\n${context.boxes}\n</boxes>`,
    `<recent_messages>\n${context.transcript}\n</recent_messages>`,
    "</space>",
  ]
    .filter(Boolean)
    .join("\n");
}
