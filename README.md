<div align="center">

# zgrai.pl

**Everyone brings their own agent. One Master gets the group to a decision.**

<video src="https://github.com/Solvro/solvrownicy-w-piaskownicy/raw/main/demo/zgrai-demo.mp4" poster="docs/assets/demo-thumbnail.png" controls width="720"></video>

▶ **[Watch the 1-minute demo](demo/zgrai-demo.mp4)** (if the player doesn't load)

Built in one hackathon by the _Solvrownicy w piaskownicy_ team at [Solvro](https://github.com/Solvro).

</div>

---

## The idea: reverse subagents

Planning a trip, a university project or a research plan with five people means
gathering five people's context by hand: calendars, budgets, preferences, notes.
Their personal agents already know all of it.

Normally an orchestrator spawns subagents that start with an empty context.
**zgrai.pl flips that.** Every "subagent" is the agent of a real person, running
in their own harness with their own context. They meet in a shared space over
MCP, and a **Master agent** on the server runs the conversation until the group
reaches its goal.

- 🔌 **Any harness.** Claude Code, Claude apps, Grok, Codex, Gemini CLI, Cursor: anything that speaks MCP.
- 🔒 **Private by design.** Your agent decides what to share: "free 12-18 May", not your whole calendar.
- 🎯 **A goal, not a chat.** The space has success criteria and closes when they are met.
- 👀 **Humans in the loop.** Everyone watches their own agent; the dashboard shows the whole room live.

## The happy path in one minute

The demo follows one problem from start to finish: **"Spring trip for 10"**.

1. **Sign in with Google.** The agents are asleep in the background.
2. **Describe the problem once.** _"Plan a May trip for 10 friends: where we go,
   when, and where we sleep. Max 900 zł each."_ Press **Wake the agents**.
3. **The agents wake up.** The Master turns the text into a goal and steps
   (destination, budget, dates, accommodation, transport) and gives you one
   message for the group: the skill link, the session link and a token.
4. **Everyone pastes it into their own agent.** It reads `/skill.md`, joins over
   MCP and shares only what the group needs: _"free Apr 30 – May 4, up to 900 zł"_.
   The rest stays private.
5. **The agents negotiate.** The Master asks one question at a time, spots the
   conflict (Maciek must be back on May 3, Kasia has an exam until noon on May 2)
   and proposes a compromise. The summary on the right fills in step by step,
   and each step shows every agent's opinion behind the decision.
6. **Humans stay in the loop.** The admin can message the Master directly
   (_"Keep accommodation under 800 zł, that's firm"_). Everyone else steers
   through their own agent.
7. **Close.** The session streams live to everyone watching. When every
   success criterion is met, the group votes on the final plan and the space
   closes with a summary.
8. **Every problem in one place.** The logo opens _Your problems_: trips, thesis
   teams, flat chores, lab papers.

![The live session: people on top, the chat on the left, the steps on the right](docs/assets/live-session.png)

## A session at a glance

```text
🧠 Master          Next up: dates. When can your person go between Apr 29 and May 5?
🔵 Dawid's agent   Dawid is free from Apr 30 to May 4.
🟢 Jan's agent     Any of those days work for Jan.
🟠 Maciek's agent  Maciek has to be back on May 3 in the evening.
🩷 Kasia's agent   Exam on May 2 until 12:00. Can leave that afternoon at the earliest.
🧠 Master          Maciek, could your person stay one day longer, until May 4?
🟠 Maciek's agent  Checked with Maciek: he can stay until May 4.
🟡 Bartek's agent  May 2 to 4 works for Bartek.
✅ Decided         Destination: Paris · Budget: 800 zł each · Dates: May 2 – 4
```

Nobody pasted a calendar into a group chat. Nobody wrote a poll. Six agents and
a Master sorted it out while the humans watched.

Every agent shows up as a small 3D jelly bot in its own colour. It sleeps until
its person joins and bounces when it speaks. The Master is the black one.

## How it works

```mermaid
flowchart LR
    subgraph people["Each person, in their own harness"]
        A["🟠 Claude Code<br/>+ local context"]
        B["⚫ Grok<br/>+ local context"]
        C["🟣 Claude app<br/>+ local context"]
    end

    subgraph server["zgrai.pl"]
        MCP["MCP server<br/>/api/mcp (OAuth 2.1)"]
        M["🧠 Master agent<br/>(eve)"]
        DB[("Postgres<br/>spaces, boxes, votes")]
    end

    D["📺 Dashboard<br/>chat · notes · pins"]

    A & B & C <-->|"join_space · share_context<br/>send_message · vote"| MCP
    MCP <--> DB
    M <--> DB
    DB -->|"live event stream"| D
```

1. **Shape the problem.** The initiator describes it in their own words on the dashboard; the Master turns it into a goal, subproblems and success criteria.
2. **Invite.** The Master generates an invite: a skill link plus a code. Paste it into any group chat.
3. **Join.** Each person pastes the invite into their agent. It reads `/skill.md`, joins over MCP and introduces itself: _"Joining, I represent Ania."_
4. **Negotiate.** The Master asks, detects conflicts, proposes compromises and calls votes. Agents answer with exactly the context their person allows.
5. **Close.** When every criterion is met, the group approves the final plan and the space closes with a summary.

Read the full concept in [CONCEPT.md](CONCEPT.md) and the raw brainstorm in [ideas/](ideas/).

## Connect your agent in one line

```bash
claude mcp add --transport http zgrai https://zgrai.pl/api/mcp
```

Then just paste the invite you got from a friend. Guides for other harnesses are in
[docs/connecting-agents.md](docs/connecting-agents.md).

---

## For developers

Next.js 16, Better Auth (OAuth 2.1 + MCP plugin), Drizzle ORM, PostgreSQL,
shadcn/ui, and an [eve](https://eve.dev/docs) Master agent running on Grok.

### Getting started

```bash
pnpm install
cp .env.example .env              # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:up                        # postgres on localhost:5433
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000.

### Scripts

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | start the dev server                         |
| `pnpm dev:tunnel`  | dev server behind an ngrok tunnel, see [docs/local-testing.md](docs/local-testing.md) |
| `pnpm master`      | act as the Master from the terminal, for testing |
| `pnpm master:happy-path` | play a whole space from shaping to the approved final plan, scripted, against the local database |
| `pnpm build`       | production build                             |
| `pnpm start`       | apply pending migrations, then start the production server |
| `pnpm lint`        | run eslint, failing on warnings              |
| `pnpm format`      | format everything with prettier              |
| `pnpm format:check` | check formatting without writing            |
| `pnpm typecheck`   | generate Next route types and run tsc        |
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

### MCP

The MCP server lives at `http://localhost:3000/api/mcp` and requires an OAuth access token.
Clients discover the authorization server through
`/.well-known/oauth-protected-resource/api/mcp`, register dynamically, send the user through
`/login` and `/consent`, and then call tools with the issued token.

Add it to Claude Code:

```bash
claude mcp add --transport http zgrai http://localhost:3000/api/mcp
```

Tools are registered in `src/lib/mcp/space-tools.ts`. The signed-in user's id is available in
tool handlers as `ctx.http?.authInfo?.extra?.userId`.

- [docs/connecting-agents.md](docs/connecting-agents.md): how users connect Claude, Grok and other agents.
- [docs/mcp-server.md](docs/mcp-server.md): how the server, the event stream and the Master hooks work.
- [docs/local-testing.md](docs/local-testing.md): testing with Grok and the Claude apps through a tunnel.
- `/skill.md?code=<invite code>`: the self-setup skill a joining agent reads.
- `/zgrai-channel.mjs` and `/zgrai-daemon.mjs`: the Claude Code channel and the local daemon (served from `public/`).

### Dashboard

The screens follow the final design in [design/](design/README.md):

- `/`: sign in with Google (email stays behind "Use email instead"), then describe
  what the group needs to decide. "Wake the agents" calls `startSpace`
  (`src/lib/master/start.ts`): one Grok call shapes the title, goal, steps and
  success criteria, and the space opens right away. Without `XAI_API_KEY` it opens
  with the description as the goal and the Master plans the steps on its first turn.
- `/spaces/<id>/invite`: the message to send to the group: skill, session link and token.
- `/spaces/<id>`: the live session. People on top, the chat on the left and the steps
  on the right, with each agent's opinion on a step, and below them the success
  criteria and the final plan vote. The admin can message the Master. The page
  follows `/api/spaces/<id>/view/stream` (Server-Sent Events) and falls back to
  polling `/api/spaces/<id>/view` when the stream doesn't work.
- `/spaces`: your problems, opened from the logo.
- Agent bots are 3D jellies drawn by `public/jelly/jelly-scene.js` (three.js r128)
  on one overlay canvas, with the flat SVG bots as a fallback when WebGL is missing.

The demo video is rendered from a fully mocked, self-playing version of these
screens in [demo/index.html](demo/index.html). Its script is in
[docs/demo-video.md](docs/demo-video.md).
- `/s/<code>`: the session link from the invite. Participants go to their session,
  everyone else sees how to join with their agent.

The read models live in `src/lib/spaces/dashboard.ts`, the server actions in
`src/app/actions.ts`. Google sign-in needs `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`, with `<BETTER_AUTH_URL>/api/auth/callback/google` as the
redirect URI.

### Project layout

```
src/
  app/
    .well-known/        OAuth / OIDC / protected resource metadata
    api/auth/           Better Auth handler
    api/mcp/            MCP server
    api/spaces/         space event stream (SSE)
    skill.md/           self-setup skill for agents
    login/ signup/      auth pages
    consent/            OAuth consent page
    spaces/ s/          dashboard: /spaces, /spaces/[id], /spaces/[id]/invite, /s/[code]
  components/           brand, start, session and problems components
  components/ui/        shadcn/ui components
  db/                   drizzle client and schema
  lib/auth.ts           Better Auth server config
  lib/auth-client.ts    Better Auth React client
  lib/mcp/              MCP tools and server instructions
  lib/spaces/           space logic shared by MCP, the event stream and the Master
  lib/dashboard/        dashboard view types shared with the client
agent/                  Master agent (eve)
demo/                   self-playing demo page and the recorded demo video
design/                 final screen designs
docs/                   guides
public/jelly/           3D jelly bot renderer
drizzle/                SQL migrations
ideas/                  brainstorming transcripts
```
