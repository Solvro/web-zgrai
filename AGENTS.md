# AGENTS.md

We are building this project during a hackathon. The git history is how we
document our work, so it has to show the whole process step by step.

## Language

- Use English everywhere in the repository: code, identifiers, comments, UI
  copy, documentation, notes, commit messages and PR descriptions.
- The only exception is raw source material, such as brainstorming
  transcripts in `ideas/`, which stays in its original language.

## Commits

- Commit early and often. Many small commits are better than one big one.
  Commit after every meaningful step: a new file, a working feature, a fix,
  a refactor, a config change, notes or ideas.
- Never batch unrelated changes into a single commit.
- Write all commit messages in English.
- Push as often as possible, ideally right after every commit, so the rest of
  the team always works on the latest state. Several people push to `main`,
  so run `git pull --rebase` before pushing.

## Branches and pull requests

- Small changes (docs, notes, config, small fixes) can go straight to `main`.
- Larger code contributions go through a pull request: a new feature, a
  refactor touching several files, or anything the rest of the team should
  review before it lands.
- Name the branch `<type>/<short-description>`, e.g. `feat/space-tools`, and
  open the PR against `main` with `gh pr create`.
- Commit and push to the branch just as often as you would to `main`.
- PR titles follow the Conventional Commits format above. Write PR
  descriptions in English.
- Follow [Conventional Commits](https://www.conventionalcommits.org/):

  ```
  <type>(<optional scope>): <short summary in imperative mood>

  <optional body explaining what and why>
  ```

  Types:

  | Type       | Use for                                          |
  | ---------- | ------------------------------------------------ |
  | `feat`     | a new feature                                    |
  | `fix`      | a bug fix                                        |
  | `docs`     | documentation, notes, ideas                      |
  | `style`    | formatting, no logic change                      |
  | `refactor` | code change that neither fixes a bug nor adds a feature |
  | `perf`     | performance improvement                          |
  | `test`     | adding or updating tests                         |
  | `build`    | build system, dependencies                       |
  | `ci`       | CI configuration                                 |
  | `chore`    | anything else (tooling, cleanup)                 |

- Summary line: lowercase, imperative ("add", not "added"), no trailing
  period, at most ~72 characters.
- Use the body when the reason behind a change is not obvious from the
  summary.

Examples:

```
docs(ideas): add brainstorming transcripts
feat(api): add endpoint for creating sandboxes
fix(ui): prevent double submit on login form
chore: set up eslint and prettier
```

## Repository layout

- `ideas/` - transcripts and notes from our brainstorming sessions. Read
  these to understand what we are building and why.
- See `README.md` for the stack, scripts and project structure.

## Stack notes

- Package manager: `pnpm`.
- UI: shadcn/ui (base-nova style, Base UI primitives). Add components and
  blocks with `pnpm dlx shadcn@latest add <name>` instead of writing them by
  hand.
- Next.js runs with `cacheComponents` enabled: wrap anything reading
  `headers()`, `cookies()`, `searchParams` or the database in `<Suspense>`.
- Database: Drizzle ORM + PostgreSQL (docker compose, port 5433). Schema lives
  in `src/db/schema`. After schema changes run `pnpm db:generate` and commit
  the migration.
- Auth: Better Auth (`src/lib/auth.ts`) with the MCP plugin. After adding a
  Better Auth plugin regenerate `src/db/schema/auth.ts` with the `auth` CLI.
- MCP tools are registered in `src/app/api/mcp/route.ts`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
