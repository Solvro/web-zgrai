import { requireMcpAuth } from "@better-auth/mcp";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth, mcpResource } from "@/lib/auth";

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "whoami",
      {
        title: "Who am I",
        description: "Return the profile of the signed-in user.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const userId = ctx.http?.authInfo?.extra?.userId;
        if (typeof userId !== "string") {
          return {
            isError: true,
            content: [{ type: "text", text: "No user bound to this token." }],
          };
        }

        const [profile] = await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, userId));

        return {
          content: [{ type: "text", text: JSON.stringify(profile ?? null) }],
        };
      },
    );
  },
  { serverInfo: { name: "solvrownicy-w-piaskownicy", version: "0.1.0" } },
);

const handler = requireMcpAuth(
  auth,
  (request, claims) => {
    const authInfo: AuthInfo = {
      token: request.headers.get("authorization")?.split(" ")[1] ?? "",
      clientId: String(claims.azp),
      scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
      expiresAt: claims.exp,
      extra: { userId: claims.sub },
    };
    return mcpHandler(Object.assign(request, { auth: authInfo }));
  },
  { resource: mcpResource },
);

export { handler as GET, handler as POST, handler as DELETE };
