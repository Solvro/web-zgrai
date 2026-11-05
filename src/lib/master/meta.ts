import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { masterMessageMeta } from "@/db/schema";
import { currentStepId } from "./plan";

export type MessageMeta = typeof masterMessageMeta.$inferSelect;

export async function setMessageMeta(
  spaceId: string,
  messageId: number,
  patch: Partial<
    Pick<MessageMeta, "subproblemId" | "withdrawnAt" | "withdrawReason">
  >,
) {
  await db
    .insert(masterMessageMeta)
    .values({ messageId, spaceId, ...patch })
    .onConflictDoUpdate({ target: masterMessageMeta.messageId, set: patch });
}

export async function messageMetaById(messageIds: number[]) {
  if (messageIds.length === 0) return new Map<number, MessageMeta>();
  const rows = await db
    .select()
    .from(masterMessageMeta)
    .where(inArray(masterMessageMeta.messageId, messageIds));
  return new Map(rows.map((row) => [row.messageId, row]));
}

// Tags a message with the step being decided when it was sent. An explicit
// subproblem_id from the Master's tools overrides it.
export async function tagWithCurrentStep(spaceId: string, messageId: number) {
  const subproblemId = await currentStepId(spaceId);
  if (!subproblemId) return;
  await db
    .insert(masterMessageMeta)
    .values({ messageId, spaceId, subproblemId })
    .onConflictDoNothing();
}
