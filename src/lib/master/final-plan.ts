import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { message, participant, proposalVote } from "@/db/schema";
import { closeSpaceAsMaster } from "@/lib/spaces/master";
import { getPlan } from "./plan";
import { markMasterSessionEnded } from "./session";
import { cancelWakes } from "./wake";

// Who has approved the final plan so far. The space ends once every active
// participant voted yes on it.
export async function finalPlanApproval(spaceId: string) {
  const plan = await getPlan(spaceId);
  if (!plan.finalProposalId) return null;
  const [proposal] = await db
    .select()
    .from(message)
    .where(
      and(eq(message.id, plan.finalProposalId), eq(message.spaceId, spaceId)),
    );
  if (!proposal) return null;

  const people = await db
    .select({ id: participant.id, represents: participant.represents })
    .from(participant)
    .where(and(eq(participant.spaceId, spaceId), isNull(participant.leftAt)));
  const votes = await db
    .select({
      participantId: proposalVote.participantId,
      choice: proposalVote.choice,
    })
    .from(proposalVote)
    .where(eq(proposalVote.proposalMessageId, proposal.id));
  const choiceOf = new Map(votes.map((v) => [v.participantId, v.choice]));

  const approvedBy = people.filter((p) => choiceOf.get(p.id) === "yes");
  const waitingFor = people.filter((p) => !choiceOf.has(p.id));
  const notApproving = people.filter(
    (p) => choiceOf.has(p.id) && choiceOf.get(p.id) !== "yes",
  );
  return {
    proposal,
    approvedBy,
    waitingFor,
    notApproving,
    approved: people.length > 0 && approvedBy.length === people.length,
  };
}

// Closes the space with the final plan as its summary once everyone approved.
export async function endSpaceIfApproved(spaceId: string) {
  const approval = await finalPlanApproval(spaceId);
  if (!approval?.approved) return false;
  await closeSpaceAsMaster(
    spaceId,
    `Everyone approved the final plan. ${approval.proposal.content}`,
  );
  await cancelWakes(spaceId);
  await markMasterSessionEnded(spaceId);
  return true;
}
