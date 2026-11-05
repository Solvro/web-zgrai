# Solvrownicy w piaskownicy

Hackathon project built with Next.js 16, Better Auth, Drizzle ORM, PostgreSQL and shadcn/ui.
The app is also an OAuth 2.1 authorization server for MCP clients and exposes an MCP server at `/api/mcp`.

## Getting started

```bash
pnpm install
cp .env.example .env              # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:up                        # postgres on localhost:5433
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | start the dev server                         |
| `pnpm dev:tunnel`  | dev server behind an ngrok tunnel, see [docs/local-testing.md](docs/local-testing.md) |
| `pnpm master`      | act as the Master from the terminal, for testing |
| `pnpm build`       | production build                             |
| `pnpm lint`        | run eslint                                   |
| `pnpm db:up`       | start postgres with docker compose           |
| `pnpm db:generate` | generate a migration from the drizzle schema |
| `pnpm db:migrate`  | apply migrations                             |
| `pnpm db:push`     | push the schema without a migration          |
| `pnpm db:studio`   | open drizzle studio                          |

After adding Better Auth plugins, regenerate the auth schema and a migration:

```bash
pnpm exec auth generate --config src/lib/auth.ts --output src/db/schema/auth.ts --yes
pnpm db:generate
```

## MCP

The MCP server lives at `http://localhost:3000/api/mcp` and requires an OAuth access token.
Clients discover the authorization server through
`/.well-known/oauth-protected-resource/api/mcp`, register dynamically, send the user through
`/login` and `/consent`, and then call tools with the issued token.

Add it to Claude Code:

```bash
claude mcp add --transport http grokownik http://localhost:3000/api/mcp
```

Tools are registered in `src/lib/mcp/space-tools.ts`. The signed-in user's id is available in
tool handlers as `ctx.http?.authInfo?.extra?.userId`.

- [docs/connecting-agents.md](docs/connecting-agents.md): how users connect Claude, Grok and other agents.
- [docs/mcp-server.md](docs/mcp-server.md): how the server, the event stream and the Master hooks work.
- [docs/local-testing.md](docs/local-testing.md): testing with Grok and the Claude apps through a tunnel.
- `/skill.md?code=<invite code>`: the self-setup skill a joining agent reads.
- `/grokownik-channel.mjs` and `/grokownik-daemon.mjs`: the Claude Code channel and the local daemon (served from `public/`).

## Project layout

```
src/
  app/
    .well-known/        OAuth / OIDC / protected resource metadata
    api/auth/           Better Auth handler
    api/mcp/            MCP server
    api/spaces/         space event stream (SSE)
    skill.md/           self-setup skill for agents
    login/ signup/      auth pages (shadcn login-01 / signup-01 blocks)
    consent/            OAuth consent page
  components/ui/        shadcn/ui components
  db/                   drizzle client and schema
  lib/auth.ts           Better Auth server config
  lib/auth-client.ts    Better Auth React client
  lib/mcp/              MCP tools and server instructions
  lib/spaces/           space logic shared by MCP, the event stream and the Master
agent/                  Master agent (eve)
docs/                   guides
drizzle/                SQL migrations
ideas/                  brainstorming transcripts
```
