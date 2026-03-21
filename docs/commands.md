# Rocket CLI — Command Reference

Full reference for all six Rocket commands.

---

## `rocket new`

### Synopsis

```
rocket new [project-name] [--type <webapp|website>]
```

### Description

Scaffolds a new project from one of Rocket's bundled templates using an interactive TUI wizard. Copies template files, installs npm dependencies (Web App) or sets up the folder structure (Website), initializes a git repository, and creates the `.agent/` directory ready for `rocket loop`.

Templates are bundled inside the package — no network access required at scaffold time.

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `project-name` | No | Name of the project directory to create. If omitted, Rocket prompts interactively. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--type <type>` | `webapp \| website` | — | Skip the type selection prompt. |

### Behavior

1. If `project-name` is not provided, Rocket prompts for one.
2. TUI prompt: **Select project type** — Web App (React + Express) or Website (PHP + MySQL).
3. **Web App only** — optional feature toggles:
   - Include auth (JWT)?
   - Include email (nodemailer)?
   - Include PDF renderer?
4. Rocket creates the project directory and copies the template.
5. Runs `npm install` (Web App) or skips (Website — no build step required by default).
6. Runs `git init && git add -A && git commit -m "Initial scaffold"`.
7. Creates `.agent/` with `PRD.md`, `PROMPT.md`, `tasks.json`, `logs/LOG.md`.
8. Prints a success screen with next-step instructions.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Project created successfully |
| `1` | Directory already exists / write error |
| `2` | npm install failed |

### Examples

```bash
# Interactive — prompts for name and type
rocket new

# Named project — prompts for type
rocket new my-saas

# Fully non-interactive
rocket new my-saas --type webapp

# Website scaffold
rocket new my-site --type website
```

---

## `rocket loop`

### Synopsis

```
rocket loop [--claude | --docker] [--once] [-n <max>]
```

### Description

Runs the AI development loop against the current project's `.agent/tasks.json`. Presents a task selection screen, then iterates — spawning the configured AI backend, monitoring its output stream, parsing for signal tags, and reporting results. On macOS, automatically runs `caffeinate -i` to prevent sleep during the loop.

### Arguments

None.

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--claude` | boolean | false | Use Claude Code CLI as the AI backend. |
| `--docker` | boolean | false | Use Claude in a Docker sandbox. |
| `--once` | boolean | false | Run a single iteration then exit. |
| `-n, --max <number>` | number | `10` | Maximum number of iterations before exiting. |

### Behavior

1. **Preflight checks:** verifies `.agent/tasks.json` exists, the selected backend binary is in PATH, and (for `--docker`) Docker is running.
2. **Task selection TUI:** lists incomplete tasks from `tasks.json`. User selects a specific task or "Auto — pick next incomplete."
3. **Loop starts:** for each iteration up to `--max`:
   a. Reads `PROMPT.md` + selected task details, assembles the prompt.
   b. Spawns the backend process.
   c. Streams output to the TUI with a spinner and rolling 3–5 line preview.
   d. Parses each output line for `<complete>`, `<blocked>`, `<decide>` tags.
   e. Saves raw output to `.agent/history/ITERATION-{SESSION_ID}-{i}.txt` (ANSI-stripped).
   f. Appends a timestamped entry to `.agent/logs/LOG.md`.
4. **Exit conditions:**
   - `<complete>` detected → task marked `passes: true`, completion report shown.
   - `<blocked>` detected → blocked screen shown with reason, exits with code `2`.
   - `<decide>` detected → decide screen shown with question, exits with code `3`.
   - Max iterations reached → exits with code `4`.
5. On exit (any cause), kills the backend process and terminates `caffeinate`.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Task completed (`<complete>` received) |
| `1` | General error (preflight failure, spawn error) |
| `2` | Loop blocked (`<blocked>` received) |
| `3` | Decision required (`<decide>` received) |
| `4` | Max iterations reached without completion |

### Examples

```bash
# Default — Copilot CLI, up to 10 iterations
rocket loop

# Use Claude Code CLI
rocket loop --claude

# Docker sandbox, cap at 25 iterations
rocket loop --docker -n 25

# Single dry-run iteration
rocket loop --once

# Claude, single iteration
rocket loop --claude --once
```

---

## `rocket feature`

### Synopsis

```
rocket feature [description] [--no-questions] [--dry-run] [--backend <name>]
```

### Description

Accepts a natural-language feature description, runs an AI-powered clarification and spec workflow, previews the resulting PRD update and new tasks, and (on confirmation) writes them to `.agent/prd/PRD.md` and `.agent/tasks.json`. Eliminates the need to manually write feature specs or task lists.

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `description` | No | Feature description in plain English. If omitted, Rocket opens an interactive text prompt. |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--no-questions` | boolean | false | Skip clarification questions; generate spec from the description alone. |
| `--dry-run` | boolean | false | Show the diff preview but do not write any changes. |
| `--backend <name>` | `copilot \| claude \| docker` | project default | Override the AI backend for this command only. |

### Behavior

1. Accept feature description as argument or prompt interactively.
2. Read `.agent/prd/PRD.md` and `.agent/tasks.json` for project context.
3. **Clarification loop** (unless `--no-questions`): display 3–5 AI-generated questions covering scope, UI needs, backend changes, dependencies, and edge cases. User answers each inline.
4. Call the AI backend with the existing PRD + feature description + answers. The AI is instructed to return:
   - A markdown feature spec block (objectives, user story, acceptance criteria, technical notes).
   - A JSON array of new tasks following the `tasks.json` schema.
   - Identification of any existing PRD sections that need updating.
5. Display a **diff-style preview** in the TUI: PRD additions on the left pane, new tasks list on the right.
6. Prompt: **Apply changes? [Yes / Edit / Cancel]**
   - **Yes** → write immediately.
   - **Edit** → open the generated content in `$EDITOR` for manual tweaks before applying.
   - **Cancel** → discard, exit with code `0`.
7. On apply: append the feature spec to `PRD.md` under `## Features Added` (or merge into an existing matching section); append new tasks to `tasks.json` with IDs continuing from `max(existing IDs) + 1`.
8. Print summary: feature name, N tasks added, PRD section updated.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Changes applied (or cancelled) |
| `1` | Backend error / AI call failed |
| `2` | Schema validation error on generated tasks |

### Examples

```bash
# Full flow with clarification questions
rocket feature "Add user authentication with JWT"

# Interactive description prompt
rocket feature

# Skip questions, generate from description only
rocket feature "Add dark mode toggle" --no-questions

# Preview without writing
rocket feature "Add CSV export" --dry-run

# Use Claude for this feature, regardless of project default
rocket feature "Add real-time notifications" --backend claude
```

---

## `rocket status`

### Synopsis

```
rocket status [--watch] [--json] [--category <name>] [--incomplete]
```

### Description

Displays a real-time TUI dashboard showing overall task completion, current focus task, per-category breakdown, and recent loop activity — all derived from `.agent/tasks.json` and `.agent/logs/LOG.md`. Use `--json` to pipe progress into other tools or CI scripts.

### Arguments

None.

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--watch` | boolean | false | Auto-refresh every 5 seconds. Press `q` to exit. |
| `--json` | boolean | false | Output structured JSON to stdout instead of TUI. |
| `--category <name>` | string | — | Filter to show only tasks in a specific category. |
| `--incomplete` | boolean | false | List all incomplete task IDs and titles. |

### Behavior

1. Read `.agent/tasks.json` and compute:
   - Overall completion: `(passes === true) / total * 100`.
   - Per-category completion: same calc grouped by `category`.
2. Read `.agent/logs/LOG.md` for recent activity (last N entries) and current focus task.
3. Read `.agent/history/` to count loop sessions and compute total runtime.
4. Render the Ink TUI dashboard with Unicode block progress bars.
5. **`--watch`** re-renders every 5 seconds, reading files fresh on each tick.
6. **`--json`** skips TUI and writes to stdout:

```json
{
  "overall": { "complete": 74, "total": 120, "percent": 62 },
  "currentTask": { "id": 42, "title": "Add JWT middleware", "category": "api-endpoint" },
  "byCategory": {
    "config":       { "complete": 10, "total": 10 },
    "functional":   { "complete": 8,  "total": 10 },
    "ui-ux":        { "complete": 5,  "total": 10 },
    "api-endpoint": { "complete": 4,  "total": 10 },
    "security":     { "complete": 2,  "total": 10 },
    "testing":      { "complete": 1,  "total": 10 },
    "docs":         { "complete": 0,  "total": 4  }
  },
  "loopSessions": 3,
  "totalRuntimeSeconds": 5040
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Dashboard rendered successfully |
| `1` | `.agent/tasks.json` not found — run `rocket init` |

### Examples

```bash
# Snapshot view
rocket status

# Live refresh
rocket status --watch

# Pipe to jq for scripting
rocket status --json | jq '.overall.percent'

# Only show api-endpoint category
rocket status --category api-endpoint

# List every incomplete task
rocket status --incomplete
```

---

## `rocket tasks`

### Synopsis

```
rocket tasks [--filter <status>]
```

### Description

A read-only TUI view of `.agent/tasks.json`. Shows task IDs, titles, categories, pass conditions, and status. Useful for reviewing the task list without opening the raw JSON file. Supports manual completion marking for tasks finished outside of the loop.

### Arguments

None.

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--filter <status>` | `incomplete \| complete \| blocked` | all | Show only tasks matching the given status. |

### Behavior

1. Read `.agent/tasks.json` and validate against the Zod schema.
2. Render the task list in an Ink TUI with status indicators.
3. Navigate with arrow keys; press `Enter` on a task to see full details including `passCondition` and `blockedReason`.
4. Press `c` on an incomplete task to manually mark it `passes: true` (for tasks completed outside the loop).
5. Press `q` to exit.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Exited normally |
| `1` | `.agent/tasks.json` not found |

### Examples

```bash
# View all tasks
rocket tasks

# Only show incomplete
rocket tasks --filter incomplete

# Only show completed
rocket tasks --filter complete
```

---

## `rocket init`

### Synopsis

```
rocket init
```

### Description

Initializes the `.agent/` directory structure in an existing project. Use this when you want to bring Rocket Loop to a project that was not created with `rocket new`. Creates placeholder files that you fill in before running `rocket loop`.

### Arguments

None.

### Options

None.

### Behavior

1. Check that `.agent/` does not already exist (warns but does not overwrite if it does).
2. Create the following files with placeholder content:
   - `.agent/prd/PRD.md` — markdown placeholder with instructions.
   - `.agent/prd/SUMMARY.md` — empty.
   - `.agent/PROMPT.md` — default loop prompt template including signal tag instructions.
   - `.agent/tasks.json` — `[]` (empty array).
   - `.agent/logs/LOG.md` — empty log with header.
   - `.agent/history/` — empty directory.
3. Print instructions: edit `PRD.md`, populate `tasks.json`, then run `rocket loop`.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | `.agent/` created successfully |
| `1` | Write error |

### Examples

```bash
# Initialize in current directory
cd my-existing-project
rocket init
```
