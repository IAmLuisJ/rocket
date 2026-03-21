# Rocket Loop

An AI development loop that runs in your terminal, iterates against your task list, and stops only when the work is done — or when it needs you.

---

## Overview

Rocket Loop is the second half of Rocket's value proposition. After you scaffold a project and define your tasks, the loop takes over: it spawns an AI agent, feeds it your current task and prompt instructions, watches the output stream, and decides what to do next — all without you having to babysit it.

**Why it exists:** Running an AI agent manually is repetitive. You prompt it, it does some work, you read the output, you prompt again. Rocket Loop automates that cycle. It handles process management, output parsing, iteration counting, signal detection, history logging, and sleep prevention — so you can step away and come back to results.

**How it differs from running the AI directly:** When you run `claude -p "..."` yourself, you get a single shot. Rocket Loop wraps that in an iteration cycle: if the task isn't marked complete after one pass, it runs again with a fresh prompt that includes the previous context. It also monitors for structured signal tags that tell Rocket exactly when to stop and why.

---

## How it works

### Iteration lifecycle

Each loop iteration follows this sequence:

```
1. SPAWN
   Rocket reads .agent/PROMPT.md and the current task from tasks.json.
   It assembles a full prompt (task title + description + pass condition + PROMPT.md instructions)
   and spawns the configured AI backend as a child process.

2. MONITOR
   Rocket pipes the backend's stdout through the TUI:
   - A spinner shows the backend is running.
   - The last 3–5 lines of output are displayed in a rolling preview pane.
   - Each output line is also written to the iteration history buffer.

3. PARSE
   Each line is passed through the tag parser (src/lib/parser/tags.ts).
   The parser scans for <complete>, <blocked>, and <decide> strings anywhere in the line.

4. CHECK TAGS
   If a tag is found, Rocket sends SIGTERM to the backend process and transitions state:
   - <complete>  → mark task passes: true, go to completion report
   - <blocked>   → show blocked screen with the reason text after the tag
   - <decide>    → show decide screen with the question text after the tag

5. REPORT
   On clean exit (complete or max iterations):
   - Completion report shows task title, iteration count, total time elapsed,
     per-step timing breakdown, and (if detectable) files changed.
   - The session is appended to .agent/logs/LOG.md.
   - All iteration output is saved to .agent/history/.
```

### What gets saved

- **Per-iteration output:** `.agent/history/ITERATION-{SESSION_ID}-{i}.txt` — ANSI escape codes stripped, raw text.
- **Session log:** `.agent/logs/LOG.md` — one entry per session with timestamp, task ID, outcome, and iteration count.

---

## Signal tags

Signal tags are plain text strings that the AI backend emits anywhere in its output. Rocket scans every output line for them.

### `<complete>`

**Meaning:** The AI considers the task finished and all pass conditions met.

**What Rocket does:** Terminates the backend process, marks `passes: true` on the task in `tasks.json`, shows the completion report screen, and exits the loop with code `0`.

**Example prompt instruction:**
```
When you have finished the task and all pass conditions are satisfied, output <complete> on its own line.
```

### `<blocked>`

**Meaning:** The AI cannot proceed without human input.

**What Rocket does:** Terminates the backend process, shows a "Blocked" screen with the reason text that follows the tag, and exits with code `2`.

**Example output from AI:**
```
I cannot proceed without database credentials. <blocked> Missing DATABASE_URL in .env
```

**Example prompt instruction:**
```
If you are unable to continue without human input, output <blocked> followed by a brief explanation of what you need.
```

### `<decide>`

**Meaning:** The AI has reached a decision point and needs the developer to make a choice before proceeding.

**What Rocket does:** Terminates the backend process, shows a "Decide" screen with the question that follows the tag, and exits with code `3`. You answer the question, then run `rocket loop` again.

**Example output from AI:**
```
<decide> Should the user profile page be a modal or a full page route?
```

**Example prompt instruction:**
```
If you reach a decision point where multiple valid approaches exist and the choice will significantly affect the implementation, output <decide> followed by a clear question for the developer.
```

---

## Writing a good PROMPT.md

`.agent/PROMPT.md` is the instruction file sent to the AI on every iteration. It tells the AI what project it's working on, how to behave, and when to emit signal tags. A well-written `PROMPT.md` is the single biggest factor in loop effectiveness.

### Tips

- **Be explicit about signal tags.** Tell the AI exactly when to emit each tag and what format to use. Don't assume it knows.
- **Include project context.** Tech stack, conventions, folder structure. The AI doesn't remember between sessions.
- **Specify what "done" means.** Reference the `passCondition` field; tell the AI that a task is complete only when its pass condition is satisfied.
- **Set boundaries.** Tell it what not to touch (e.g., "do not modify any files in `src/lib/`").
- **Keep it concise.** Long prompts dilute attention. Aim for under 400 words.

### Template

```markdown
# Rocket Loop — Project Instructions

## Project
<project name and one-sentence description>

## Stack
<tech stack summary — framework, language, database, key libraries>

## Conventions
- <coding convention 1>
- <coding convention 2>
- File structure: <brief description>

## Your job
You will be given one task at a time. Read the task title, description, and pass condition carefully.
Work iteratively. Make changes, verify them, then emit the appropriate signal.

## Signals — you MUST use these
- When the task is complete and all pass conditions are satisfied: output `<complete>` on its own line.
- When you cannot continue without human input: output `<blocked> <reason>` on its own line.
- When you need the developer to make a choice before proceeding: output `<decide> <question>` on its own line.

## Constraints
- Do not modify files outside of `src/` and `tests/` unless the task explicitly requires it.
- Do not install new dependencies without checking existing `package.json` first.
- Write tests for any new public functions.
```

---

## AI backends

### Comparison

| Backend | Flag | Isolation | Requires |
|---------|------|-----------|---------|
| GitHub Copilot CLI | _(default)_ | None — runs in your working dir | `copilot` in PATH, GitHub auth |
| Claude Code CLI | `--claude` | None — runs in your working dir | `claude` in PATH |
| Claude + Docker | `--docker` | Docker container | Docker running, `docker` in PATH |

- **Copilot CLI** is the default. It uses `copilot --autopilot --prompt "..."`. Best for developers already on GitHub Copilot.
- **Claude direct** (`--claude`) uses `claude --model opus -p "..."`. Faster iteration, no container overhead.
- **Claude Docker** (`--docker`) uses `docker sandbox run claude . -- --model opus -p "..."`. Runs Claude in an isolated container with your project directory mounted. Best for tasks where you want filesystem isolation.

### Setup: GitHub Copilot CLI

1. Install: `npm install -g @githubnext/github-copilot-cli`
2. Authenticate: `github-copilot-cli auth`
3. Verify: `copilot --version`

### Setup: Claude Code CLI

1. Install: `npm install -g @anthropic-ai/claude-code` (or per Anthropic's current install instructions)
2. Authenticate: `claude auth` (follows Anthropic's OAuth flow)
3. Verify: `claude --version`

### Setup: Claude + Docker

1. Install Docker Desktop: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Ensure Docker is running: `docker info`
3. The `docker sandbox` subcommand is provided by Claude's Docker image — no separate install required once Claude CLI is set up.
4. Verify: `docker sandbox run claude . -- --version`

---

## macOS caffeinate

On macOS, Rocket automatically starts `caffeinate -i` as a background process when the loop begins. This prevents the system from sleeping during a long loop session — important for tasks that can take 20–60+ minutes.

`caffeinate` is a macOS built-in (no install required). Rocket spawns it with `-i` (prevent idle sleep) and kills it when the loop exits for any reason, including Ctrl+C.

On Linux, `caffeinate` is not available. Rocket skips it silently — no error, no impact on loop behavior.

---

## History and logs

### Iteration history

Each time an iteration runs, its full output is saved to:

```
.agent/history/ITERATION-{SESSION_ID}-{i}.txt
```

- `SESSION_ID` is a timestamp-based ID generated when the loop starts.
- `i` is the iteration number within the session (1-indexed).
- ANSI escape codes are stripped so the files are plain text.

These files are the ground truth for what the AI did. If you want to audit a loop session, read them directly.

### Progress log

`.agent/logs/LOG.md` is a markdown file appended after each session with entries like:

```markdown
## Session 2026-03-21T14:28:00 · Task #42

- **Task:** Add JWT middleware to Express routes
- **Outcome:** complete
- **Iterations:** 3
- **Duration:** 4m 12s
- **Backend:** copilot
```

`rocket status` reads this file to populate the "Recent Activity" and session stats sections of the dashboard.

---

## Configuration options

Loop behavior is controlled via CLI flags. There is no separate config file — all options are per-invocation.

| Option | Flag | Default | Description |
|--------|------|---------|-------------|
| Max iterations | `-n <number>` | `10` | Stop after N iterations regardless of signals. |
| Backend | `--claude \| --docker` | Copilot | Which AI backend to use. |
| Single run | `--once` | false | Run exactly one iteration. |

---

## Troubleshooting

### `Backend not found` error

Rocket checks for the backend binary in PATH before starting.

- **Copilot:** run `which copilot`. If not found, install via npm: `npm install -g @githubnext/github-copilot-cli`.
- **Claude:** run `which claude`. If not found, install Claude Code CLI.
- **Docker:** run `docker info`. If Docker is not running, start Docker Desktop.

### `Docker not running`

The preflight check runs `docker info` before spawning the container. If Docker Desktop is not running, start it and try again.

### `No tasks.json found`

`rocket loop` requires `.agent/tasks.json` to exist and contain at least one task. Run `rocket init` to create the structure, then populate `tasks.json` manually or via `rocket feature`.

### `All tasks are complete`

If every task in `tasks.json` has `passes: true`, Rocket shows a congratulations screen and exits. Add new tasks with `rocket feature` or edit `tasks.json` directly.

### Auth issues (Copilot)

Run `github-copilot-cli auth` to re-authenticate. Copilot uses GitHub OAuth — tokens can expire.

### Auth issues (Claude)

Run `claude auth` to re-authenticate. Claude uses Anthropic's OAuth flow.

### Loop exits immediately without doing anything

Check that `PROMPT.md` is not empty and that the selected task has a non-empty `description` field. Rocket assembles the prompt from both — an empty prompt will cause the AI to emit `<complete>` immediately or produce no output.
