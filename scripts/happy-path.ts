import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { user } from "@/db/schema";
import { endSpaceIfApproved } from "@/lib/master/final-plan";
import {
  addConstraint,
  getPlan,
  markCriterion,
  setFinalProposal,
  unmetCriteria,
  updateSubproblem,
} from "@/lib/master/plan";
import { startSpace } from "@/lib/master/start";
import {
  ask,
  getMasterContext,
  postMasterMessage,
  propose,
  recordDecision,
  updateNotes,
} from "@/lib/spaces/master";
import {
  getSpaceOrThrow,
  joinSpace,
  sendMessage,
  shareContext,
  vote,
} from "@/lib/spaces/service";

// The happy path of the Master, scripted: shape the problem, invite four
// agents, collect context, decide every step by majority vote, get the final
// plan approved and close the space. It plays both sides (the Master and the
// participants) through the same library functions the real Master tools and
// the MCP server call, so it needs no model and no eve. Run it against a
// local database:
//
//   pnpm master:happy-path

const DESCRIPTION =
  "Plan a May trip for four friends: pick the destination, dates and a stay. Budget is 400 EUR each.";

const PEOPLE = [
  { name: "Ania", harness: "claude-code" },
  { name: "Bartek", harness: "grok" },
  { name: "Celina", harness: "claude-app" },
  { name: "Dawid", harness: "claude-code" },
] as const;

function step(text: string) {
  console.log(`\n▶ ${text}`);
}

function say(who: string, text: string) {
  console.log(`  ${who.padEnd(8)} ${text}`);
}

async function createUser(name: string, runId: string) {
  const [row] = await db
    .insert(user)
    .values({
      id: randomUUID(),
      name,
      email: `${name.toLowerCase()}-${runId}@happy-path.local`,
    })
    .returning();
  return row;
}

async function main() {
  const runId = randomUUID().slice(0, 8);
  const users = await Promise.all(PEOPLE.map((p) => createUser(p.name, runId)));
  const [initiator, ...guests] = users;

  step("1. Shape the problem");
  const started = await startSpace({
    userId: initiator.id,
    description: DESCRIPTION,
  });
  const spaceId = started.space.id;
  say("Master", `Goal: ${started.space.goal}`);
  let plan = await getPlan(spaceId);
  if (plan.subproblems.length === 0 || plan.criteria.length === 0) {
    throw new Error(
      "The space has no steps or criteria. Set XAI_API_KEY so the problem gets shaped.",
    );
  }
  say("Master", `Steps: ${plan.subproblems.map((s) => s.title).join(" → ")}`);
  say("Master", `Criteria: ${plan.criteria.map((c) => c.text).join("; ")}`);
  await addConstraint(spaceId, "Budget: at most 400 EUR per person");
  await updateSubproblem(spaceId, plan.subproblems[0].id, {
    status: "discussing",
  });

  step("2. Invite and join");
  say("Master", `Invite code: ${started.invite_code}`);
  const joined = [];
  for (const [i, guest] of guests.entries()) {
    const person = PEOPLE[i + 1];
    const result = await joinSpace({
      userId: guest.id,
      inviteCode: started.invite_code,
      represents: person.name,
      harness: person.harness,
      intro: `Joining, I represent ${person.name}.`,
    });
    joined.push(result.participant);
    say(person.name, "joined");
  }
  const everyone = [started.participant, ...joined];

  step("3. Collect context");
  await ask({
    spaceId,
    question:
      "Share the dates you can't make in May and any destinations you want to skip.",
  });
  const context = [
    "Free 12-18 May. Skip Czechia.",
    "Free 10-20 May. Prefers a big city.",
    "Free 12-18 May. Needs breakfast included.",
    "Free 11-19 May. Was in Vienna in March.",
  ];
  for (const [i, person] of PEOPLE.entries()) {
    await shareContext({
      spaceId,
      userId: users[i].id,
      topic: "Availability and preferences",
      content: context[i],
    });
    say(person.name, context[i]);
  }
  await updateNotes(
    spaceId,
    "Everyone is free 12-18 May. Vienna is out (Dawid was there in March). Celina needs breakfast.",
  );

  step("4. Decide every step by majority vote");
  const proposals: Record<string, string> = {};
  const options = [
    "Paris",
    "12-18 May",
    "B&B near Bastille, breakfast included, 280 EUR each",
  ];
  plan = await getPlan(spaceId);
  for (const [i, subproblem] of plan.subproblems.entries()) {
    const option = options[i] ?? `${subproblem.title}: agreed option`;
    const proposal = await propose({
      spaceId,
      proposal: `${subproblem.title}: ${option}`,
    });
    say("Master", `Proposes ${subproblem.title}: ${option}`);
    // Three yes and one no: the majority wins.
    for (const [j, person] of PEOPLE.entries()) {
      const choice = j === PEOPLE.length - 1 && i === 0 ? "no" : "yes";
      await vote({
        spaceId,
        userId: users[j].id,
        proposalId: proposal.id,
        choice,
      });
      say(person.name, `votes ${choice}`);
    }
    await recordDecision({
      spaceId,
      title: subproblem.title,
      content: option,
      subproblemId: subproblem.id,
    });
    await updateSubproblem(spaceId, subproblem.id, {
      status: "decided",
      decision: option,
    });
    proposals[subproblem.id] = option;
    say("Master", `Decided ${subproblem.title}: ${option}`);
  }
  await sendMessage({
    spaceId,
    userId: guests[1].id,
    text: "Fine with the plan, thanks Master.",
  });

  step("5. Mark the criteria");
  plan = await getPlan(spaceId);
  for (const criterion of plan.criteria) {
    await markCriterion(spaceId, criterion.id, {
      met: true,
      evidence: "Decided by majority vote.",
    });
    say("Master", `Met: ${criterion.text}`);
  }
  plan = await getPlan(spaceId);
  if (unmetCriteria(plan).length > 0) throw new Error("Criteria still unmet.");

  step("6. Final plan and approval");
  const summary = Object.values(proposals).join(" · ");
  const finalPlan = await propose({
    spaceId,
    proposal: `Final plan, approve to finish the space:\n\n${summary}`,
  });
  await setFinalProposal(spaceId, finalPlan.id);
  say("Master", `Final plan: ${summary}`);
  for (const [j, person] of PEOPLE.entries()) {
    await vote({
      spaceId,
      userId: users[j].id,
      proposalId: finalPlan.id,
      choice: "yes",
    });
    say(person.name, "approves");
  }

  step("7. Close");
  await postMasterMessage({
    spaceId,
    text: "All criteria met. Final plan approved. Closing the space.",
  });
  const closed = await endSpaceIfApproved(spaceId);
  if (!closed) throw new Error("The space did not close.");
  const final = await getSpaceOrThrow(spaceId);
  say("Master", `Space is ${final.status}`);
  say("Master", `Summary: ${final.summary}`);

  const board = await getMasterContext(spaceId);
  console.log(
    `\n✅ Happy path complete: ${everyone.length} participants, ${board.tallies.length} proposals, space ${final.id}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
