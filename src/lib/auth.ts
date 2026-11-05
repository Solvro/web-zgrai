import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const authIssuer = `${baseURL}/api/auth`;
export const mcpResource = `${baseURL}/api/mcp`;

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt(),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
    }),
    nextCookies(),
  ],
});
