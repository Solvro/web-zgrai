# Master agent (eve)

The Master agent from [CONCEPT.md](../CONCEPT.md) is built with
[eve](https://eve.dev/docs). This directory is a working starting point: the
agent builds, starts with the app and answers on `/eve/v1/*`. The real Master
logic still has to be written.

## What is here

| File                        | Purpose                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `agent.ts`                  | Agent config. Uses `anthropic()` from `eve/models/anthropic`, which reads `ANTHROPIC_API_KEY`. |
| `instructions.md`           | The Master's system prompt.                                                               |
| `channels/eve.ts`           | Who may call the agent over HTTP: users with a Better Auth session, plus `localDev()`.    |
| `tools/get_user_profile.ts` | Example tool that reads our database through `@/db`. Replace it with the real tools.      |

Tools run in the app runtime, so they can import anything from `src/` through
the `@/` alias, including `@/db` and `@/lib/auth`.

## Run it

```bash
pnpm dev
```

`next.config.ts` is wrapped with `withEve` from `eve/next`, so `next dev` also
starts the agent and proxies `/eve/v1/*` to it. Check it with:

```bash
curl localhost:3000/eve/v1/health
```

To work on the agent alone in eve's terminal UI, run `pnpm exec eve dev`.

Set `ANTHROPIC_API_KEY` in `.env`. In local development the model helpers can
also use credentials saved with `/login` in the eve terminal UI.

## Self-hosting

We self-host, so nothing here may depend on Vercel:

- **Model:** a direct provider helper (`anthropic()`, `openai()`) or an AI SDK
  provider package, never a gateway model string such as
  `"anthropic/claude-opus-5.5"`, which needs the Vercel AI Gateway.
- **Auth:** don't add `vercelOidc()`. Browser calls are authenticated with the
  Better Auth session cookie in `channels/eve.ts`. Server-to-agent calls need
  their own `AuthFn` (e.g. `jwtHmac` or a shared secret) before production.
- **Durable state:** the default local workflow world stores sessions in
  `.eve/.workflow-data`, which has to live on persistent storage. For several
  replicas switch to the Postgres world: `pnpm add @workflow/world-postgres`,
  set `experimental.workflow.world` in `agent.ts`, point
  `WORKFLOW_POSTGRES_URL` at a database and run `pnpm exec bootstrap` once.
- **Production:** `eve build`, `pnpm build`, then `next start` runs the app
  and the agent together (the agent listens on port 4274, change it with
  `EVE_NEXT_PRODUCTION_PORT`). The reverse proxy must forward `/eve/` and
  `/.well-known/workflow/` without rewriting paths.
- **Sandbox:** the Master doesn't need shell or file tools. If we ever add
  them, use Docker (`DockerSandbox.environment()`), not Vercel Sandbox.

The full docs ship with the package in `node_modules/eve/docs`, e.g.
`guides/frontend/nextjs.mdx` and `guides/deployment/self-hosting/index.md`.

## Next steps

These follow [Master loop](../CONCEPT.md#master-loop) in the concept:

1. Replace `get_user_profile` with the Master's internal tools:
   `post_message`, `ask`, `propose`, `record_decision`, `close_space`. They
   read and write the same tables as the MCP tools in `/api/mcp`.
2. Start a Master session when a space is created, and continue it on every
   event (join, message, vote, deadline). From server code use `Client` from
   `eve/client`, or `ctx.to(...)` from inside tools.
3. Pass participant messages to the Master signed with their author, as
   described in [How the Master sees participants](../CONCEPT.md#how-the-master-sees-participants).
4. Replace `localDev()`-only access for server calls with a production
   `AuthFn` before deploying.
