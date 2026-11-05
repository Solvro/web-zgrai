import { getSpaceOrThrow } from "@/lib/spaces/service";
import { spaceIdForSession } from "./space-of-session";

// The space a Master tool acts on, resolved from the eve session. Closed
// spaces are read-only.
export async function toolSpace(ctx: { session: { id: string } }) {
  const spaceId = await spaceIdForSession(ctx.session.id);
  const row = await getSpaceOrThrow(spaceId);
  if (row.status === "closed") {
    throw new Error("The space is closed. Nothing can be posted any more.");
  }
  return row;
}
