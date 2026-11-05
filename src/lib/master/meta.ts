import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { masterMessageMeta } from "@/db/schema";

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
