# Master agent (eve)

The Master agent from [CONCEPT.md](../CONCEPT.md) is built with
[eve](https://eve.dev/docs). It starts with the app, answers on `/eve/v1/*`,
and runs one eve session per space, driven by `src/lib/master/runtime.ts`.

## What is here

| File                    | Purpose                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `agent.ts`              | Agent config. Runs on Grok through `@ai-sdk/xai`, which reads `XAI_API_KEY`; `XAI_MODEL` overrides the model. |
| `instructions.md`       | The Master's system prompt.                                                                    |
| `instructions/space.ts` | The current stage and a fresh snapshot of the space, rebuilt before every model call.          |
| `channels/eve.ts`       | Who may call the agent over HTTP: only our own server, plus `localDev()` when opted in.        |
| `tools/`                | The Master's tools, one file per tool. The file name is the tool name.                        |

Tools run in the app runtime, so they can import anything from `src/` through
the `@/` alias. Each tool resolves its space from the eve session with
`toolSpace(ctx)`, never from the model's input, so the Master can't touch
another space. The logic behind them lives in `src/lib/master/`.

## Tools

| Group             | Tools                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Talk              | `post_message`, `ask`, `remind`, `propose`, `propose_options`, `withdraw_proposal`, `record_decision`, `propose_final_plan` |
| Wait              | `schedule_check`, `cancel_check`, `schedule_reminder`, `cancel_reminder`, `extend_deadline`, `close_question`   |
| Plan              | `update_draft`, `update_subproblem`, `add_subproblem`, `remove_subproblem`, `add_constraint`, `remove_constraint`, `set_criteria`, `mark_criterion` |
| Dashboard         | `update_notes`, `pin`, `update_pin`, `unpin`                                                                    |
| Look up           | `get_history`, `search_messages`, `get_message`, `get_participant`, `list_proposals`, `list_questions`, `get_activity` |
| Compute           | `calculate`, `date_info`, `find_common_dates`, `rank_options`                                                   |

Notes:

- Public text from the Master goes through `assertNoPrivateQuote`, which
  rejects a message that repeats a sentence of someone's private note.
- Proposal outcomes (`src/lib/master/votes.ts`) and question status
  (`src/lib/master/questions.ts`) are computed in code and shown in the
  snapshot, so the model doesn't count votes or answers itself.
- The Master gets a turn 10 s after the last event (at most 30 s after the
  first), or right away once everyone answered a question (`<answered>`).
- `schedule_check` is one idle check per space: it fires once the space has
  been quiet for its interval, and every event pushes it back; `schedule_reminder`
  is a one-off `reminder` row in `master_wake` with its note in `reason`, and
  the Master can have several. Both reach it as events (`<check>`,
  `<reminder>`).
- The space ends when everyone approves the final plan from
  `propose_final_plan` (`src/lib/master/final-plan.ts`).
- `calculate` uses a small parser, not `eval`. The compute tools are pure
  functions in `src/lib/master/compute/`.
- The Master has no web or shell tools on purpose: it reads untrusted
  participant text, and a fetch tool would let a message exfiltrate private
  notes through a URL.

## Run it

```bash
pnpm dev
```

`next.config.ts` is wrapped with `withEve` from `eve/next`, so `next dev` also
starts the agent and proxies `/eve/v1/*` to it. Check it with:

```bash
curl localhost:3000/eve/v1/health
```

To work on the agent alone in eve's terminal UI, set `EVE_ALLOW_LOCAL_DEV=1`
and run `pnpm exec eve dev`.

Set `XAI_API_KEY` in `.env`.

## Self-hosting

We self-host, so nothing here may depend on Vercel:

- **Model:** a direct provider helper (`anthropic()`, `openai()`) or an AI SDK
  provider package, never a gateway model string such as
  `"anthropic/claude-opus-5.5"`, which needs the Vercel AI Gateway.
- **Auth:** don't add `vercelOidc()`. Server-to-agent calls are authenticated
  with the shared secret from `src/lib/master/internal-auth.ts`.
- **Durable state:** the default local workflow world stores sessions in
  `.eve/.workflow-data`, which has to live on persistent storage. For several
  replicas switch to the Postgres world: `pnpm add @workflow/world-postgres`,
  set `experimental.workflow.world` in `agent.ts`, point
  `WORKFLOW_POSTGRES_URL` at a database and run `pnpm exec bootstrap` once.
- **Production:** `eve build`, `pnpm build`, then `next start` runs the app
  and the agent together (the agent listens on port 4274, change it with
  `EVE_NEXT_PRODUCTION_PORT`). The reverse proxy must forward `/eve/` and
  `/.well-known/workflow/` without rewriting paths.
- **Sandbox:** the Master doesn't need shell or file tools, so
  `agent/sandbox.ts` selects just-bash, which needs no Docker daemon. If we
  ever add those tools, switch to Docker (`DockerSandbox.environment()`), not
  Vercel Sandbox.

The full docs ship with the package in `node_modules/eve/docs`, e.g.
`guides/frontend/nextjs.mdx` and `guides/deployment/self-hosting/index.md`.
