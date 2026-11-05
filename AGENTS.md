# AGENTS.md

We are building this project during a hackathon. The git history is how we
document our work, so it has to show the whole process step by step.

## Commits

- Commit early and often. Many small commits are better than one big one.
  Commit after every meaningful step: a new file, a working feature, a fix,
  a refactor, a config change, notes or ideas.
- Never batch unrelated changes into a single commit.
- Write all commit messages in English.
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
