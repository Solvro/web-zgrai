import { eq } from "drizzle-orm";
import { db } from "@/db";
import { masterSession } from "@/db/schema";

// Inside the agent, the space comes from the eve session, never from the
// model's tool input, so the Master can't write to another space.
export async function spaceIdForSession(sessionId: string) {
  const [row] = await db
    .select({ spaceId: masterSession.spaceId })
    .from(masterSession)
    .where(eq(masterSession.sessionId, sessionId));
  if (!row)
    throw new Error(`No space is bound to Master session ${sessionId}.`);
  return row.spaceId;
}
