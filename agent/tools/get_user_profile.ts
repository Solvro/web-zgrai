import { eq } from "drizzle-orm";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";

export default defineTool({
  description: "Get the name and email of a user by their id.",
  inputSchema: z.object({ userId: z.string().min(1) }),
  async execute({ userId }) {
    const [profile] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId));
    return profile ?? null;
  },
});
