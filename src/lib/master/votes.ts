import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { message, participant, proposalVote } from "@/db/schema";
import { messageMetaById } from "./meta";

export type ProposalOutcome =
  "passed" | "rejected" | "tie" | "pending" | "withdrawn";

// Majority rule from the instructions: yes against no, abstentions don't
// count. A result is final once the people who haven't voted can't change it.
export function proposalOutcome(
  tally: { yes: number; no: number },
  notVoted: number,
  withdrawn: boolean,
): ProposalOutcome {
  if (withdrawn) return "withdrawn";
  if (tally.yes > tally.no + notVoted) return "passed";
  if (tally.no > tally.yes + notVoted) return "rejected";
  return notVoted > 0 ? "pending" : "tie";
}

export type ProposalDetails = Awaited<
  ReturnType<typeof getProposalDetails>
>[number];

export async function getProposalDetails(
  spaceId: string,
  options: { ids?: number[]; limit?: number } = {},
) {
  const proposals = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        eq(message.kind, "proposal"),
        options.ids ? inArray(message.id, options.ids) : undefined,
      ),
    )
    .orderBy(desc(message.id))
    .limit(options.limit ?? 100);
  if (proposals.length === 0) return [];

  const ids = proposals.map((p) => p.id);
  const active = await db
    .select({ id: participant.id, represents: participant.represents })
    .from(participant)
    .where(and(eq(participant.spaceId, spaceId), isNull(participant.leftAt)));
  const votes = await db
    .select({
      proposalId: proposalVote.proposalMessageId,
      participantId: proposalVote.participantId,
      represents: participant.represents,
      choice: proposalVote.choice,
      comment: proposalVote.comment,
    })
    .from(proposalVote)
    .innerJoin(participant, eq(participant.id, proposalVote.participantId))
    .where(inArray(proposalVote.proposalMessageId, ids));
  const meta = await messageMetaById(ids);

  return proposals.reverse().map((p) => {
    const mine = votes.filter((v) => v.proposalId === p.id);
    const tally = { yes: 0, no: 0, abstain: 0 };
    for (const v of mine) tally[v.choice] += 1;
    const voted = new Set(mine.map((v) => v.participantId));
    const notVoted = active.filter((a) => !voted.has(a.id));
    const info = meta.get(p.id);
    return {
      proposal_id: p.id,
      content: p.content,
      created_at: p.createdAt.toISOString(),
      subproblem_id: info?.subproblemId ?? null,
      withdrawn: info?.withdrawnAt
        ? { at: info.withdrawnAt.toISOString(), reason: info.withdrawReason }
        : null,
      tally,
      outcome: proposalOutcome(tally, notVoted.length, !!info?.withdrawnAt),
      votes: mine.map((v) => ({
        participant_id: v.participantId,
        represents: v.represents,
        choice: v.choice,
        comment: v.comment,
      })),
      not_voted: notVoted.map((a) => ({
        participant_id: a.id,
        represents: a.represents,
      })),
    };
  });
}

export async function getProposalOrThrow(spaceId: string, proposalId: number) {
  const [details] = await getProposalDetails(spaceId, { ids: [proposalId] });
  if (!details) throw new Error(`Proposal ${proposalId} not found.`);
  return details;
}
