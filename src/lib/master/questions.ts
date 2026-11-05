import { and, desc, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { boxItem, masterWake, message, participant } from "@/db/schema";
import { messageMetaById } from "./meta";

// A participant answered a question when they said anything or shared context
// after it was asked. The Master reads the answers in the transcript.
export async function getQuestionStatuses(
  spaceId: string,
  options: { ids?: number[]; limit?: number } = {},
) {
  const questions = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        eq(message.kind, "question"),
        options.ids ? inArray(message.id, options.ids) : undefined,
      ),
    )
    .orderBy(desc(message.id))
    .limit(options.limit ?? 50);
  if (questions.length === 0) return [];

  const people = await db
    .select()
    .from(participant)
    .where(and(eq(participant.spaceId, spaceId), isNull(participant.leftAt)));
  const oldest = questions.at(-1)!;
  const spoke = await db
    .select({
      id: message.id,
      author: message.authorParticipantId,
    })
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        gt(message.id, oldest.id),
        isNotNull(message.authorParticipantId),
      ),
    );
  const shared = await db
    .select({ at: boxItem.createdAt, author: boxItem.participantId })
    .from(boxItem)
    .where(
      and(
        eq(boxItem.spaceId, spaceId),
        gt(boxItem.createdAt, oldest.createdAt),
      ),
    );
  const deadlines = await db
    .select({ questionId: masterWake.refMessageId, dueAt: masterWake.dueAt })
    .from(masterWake)
    .where(
      and(
        eq(masterWake.spaceId, spaceId),
        eq(masterWake.kind, "deadline"),
        isNull(masterWake.doneAt),
        inArray(
          masterWake.refMessageId,
          questions.map((q) => q.id),
        ),
      ),
    );
  const meta = await messageMetaById(questions.map((q) => q.id));

  return questions.reverse().map((q) => {
    const asked = q.addressedTo?.length
      ? people.filter((p) => q.addressedTo!.includes(p.id))
      : people;
    const answered = new Set([
      ...spoke.filter((s) => s.id > q.id).map((s) => s.author),
      ...shared.filter((s) => s.at > q.createdAt).map((s) => s.author),
    ]);
    const due = deadlines.find((d) => d.questionId === q.id)?.dueAt ?? null;
    const brief = (p: (typeof people)[number]) => ({
      participant_id: p.id,
      represents: p.represents,
    });
    return {
      question_id: q.id,
      question: q.content,
      asked_at: q.createdAt.toISOString(),
      subproblem_id: meta.get(q.id)?.subproblemId ?? null,
      deadline: due?.toISOString() ?? null,
      waiting: due !== null,
      answered: asked.filter((p) => answered.has(p.id)).map(brief),
      missing: asked.filter((p) => !answered.has(p.id)).map(brief),
    };
  });
}

export type QuestionStatus = Awaited<
  ReturnType<typeof getQuestionStatuses>
>[number];

export async function getQuestionOrThrow(spaceId: string, questionId: number) {
  const [status] = await getQuestionStatuses(spaceId, { ids: [questionId] });
  if (!status) throw new Error(`Question ${questionId} not found.`);
  return status;
}
