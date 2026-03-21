# 🚀 Rocket

> Bootstrap projects and run AI development loops from your terminal.

Rocket is the only scaffolding CLI that also keeps building — scaffold a project in seconds, then hand it off to an AI agent that iterates autonomously until the work is done.

## What it does

Rocket has two core capabilities. **`rocket new`** scaffolds production-ready projects from opinionated templates (React + Express or PHP + MySQL) with a guided interactive wizard — project type, auth, email, and more in under 30 seconds. **Rocket Loop** (`rocket loop`) then drives an AI agent iteratively against your task list, monitoring output, detecting completion signals, and reporting results — so you can step away while real work gets done.

## Install

```bash
npm install -g rocket-cli
```

> Requires Node.js 22+. macOS and Linux only.

---

## Commands

### `rocket new`

Scaffold a new project from an opinionated template with an interactive wizard.

```bash
rocket new my-app
# or specify type directly
rocket new my-app --type webapp
```

The wizard walks through project type selection (Web App or Website) and optional feature toggles (auth, email, PDF renderer). Rocket scaffolds the folder, installs dependencies, initializes git, and creates the `.agent/` directory structure.

---

### `rocket loop`

Run the AI development loop against your `.agent/tasks.json`.

```bash
rocket loop                # default: GitHub Copilot CLI
rocket loop --claude       # Claude Code CLI (no Docker)
rocket loop --docker       # Claude in Docker sandbox
rocket loop --once         # single iteration only
rocket loop -n 20          # max 20 iterations
```

On launch you select a focus task (or let Rocket pick the next incomplete one). The loop then spawns the AI backend, streams output with a live spinner preview, and monitors for exit signals:

| Signal | Meaning | What Rocket does |
|--------|---------|-----------------|
| `<complete>` | Task is finished | Exits loop, shows completion report |
| `<blocked>` | AI needs human input | Pauses, shows reason, exits cleanly |
| `<decide>` | AI needs a decision | Pauses, shows question, exits cleanly |

Add these tags to your `.agent/PROMPT.md` so the AI knows to emit them.

---

### `rocket feature`

Describe a feature in plain English — Rocket asks clarifying questions, generates a spec, and appends it to your PRD and task list.

```bash
rocket feature "Add user authentication"
rocket feature              # interactive description prompt
rocket feature "..." --no-questions
rocket feature "..." --dry-run
rocket feature "..." --backend claude
```

The full flow: clarification questions → AI-generated spec + tasks → diff preview → apply. New tasks are appended to `tasks.json` with IDs continuing from the current max.

---

### `rocket status`

Live project progress dashboard — task completion by category, current focus task, and recent loop activity.

```bash
rocket status
rocket status --watch       # auto-refresh every 5s
rocket status --json        # output raw JSON for scripting
rocket status --incomplete  # list all incomplete tasks
rocket status --category api-endpoint
```

Dashboard preview:

```
┌─────────────────────────────────────────────────────┐
│  🚀 Rocket Status · my-saas                         │
│  2026-03-21  14:32                                   │
├─────────────────────────────────────────────────────┤
│  Overall Progress                                    │
│  ████████████████████░░░░░░░░░░  62%  74/120 tasks  │
├─────────────────────────────────────────────────────┤
│  Current Focus Task                                  │
│  #42 · Add JWT middleware to Express routes          │
│  Category: api-endpoint  ·  Status: in progress     │
├─────────────────────────────────────────────────────┤
│  By Category                                        │
│  config         ██████████  10/10  100%             │
│  functional     ████████░░   8/10   80%             │
│  ui-ux          █████░░░░░   5/10   50%             │
│  api-endpoint   ████░░░░░░   4/10   40%             │
│  security       ██░░░░░░░░   2/10   20%             │
│  testing        █░░░░░░░░░   1/10   10%             │
│  docs           ░░░░░░░░░░   0/4     0%             │
├─────────────────────────────────────────────────────┤
│  Recent Activity (from LOG.md)                      │
│  ✅ #40 Set up Express server          3m ago        │
│  ✅ #41 Create /api/health endpoint    8m ago        │
│  🔄 #42 Add JWT middleware             running       │
├─────────────────────────────────────────────────────┤
│  Loop Sessions: 3  ·  Total runtime: 1h 24m         │
│  Last run: 14:28  ·  Blocked: 0  ·  Decided: 1      │
└─────────────────────────────────────────────────────┘
```

---

### `rocket tasks`

Read-only view of `.agent/tasks.json` with filter and manual completion.

```bash
rocket tasks
rocket tasks --filter incomplete
```

---

### `rocket init`

Adds the `.agent/` structure to an existing project.

```bash
rocket init
```

Creates `.agent/prd/PRD.md`, `.agent/PROMPT.md`, `.agent/tasks.json`, and `.agent/logs/LOG.md` with placeholder content.

---

## Project structure (`.agent/`)

```
.agent/
  prd/
    PRD.md          # Your project requirements document
    SUMMARY.md      # Auto-generated project summary
  logs/
    LOG.md          # Loop progress log (appended after each session)
  history/          # Per-iteration AI output (ANSI-stripped .txt files)
  PROMPT.md         # Loop instructions sent to the AI on each iteration
  tasks.json        # Implementation task list (Zod-validated schema)
```

---

## AI Backends

| Backend | Flag | Command used | Requirement |
|---------|------|-------------|-------------|
| GitHub Copilot CLI | _(default)_ | `copilot --autopilot --prompt "..."` | `copilot` in PATH, GitHub auth |
| Claude Code CLI | `--claude` | `claude --model opus -p "..."` | `claude` in PATH |
| Claude + Docker | `--docker` | `docker sandbox run claude . -- --model opus -p "..."` | Docker running |

---

## Rocket Loop signals

Place these in your `.agent/PROMPT.md` so the AI knows when to use them:

| Tag | Meaning | What Rocket does |
|-----|---------|-----------------|
| `<complete>` | Task is finished | Exits loop with success screen |
| `<blocked>` | Needs human input | Pauses, shows reason, exits |
| `<decide>` | Needs a decision | Pauses, shows question, exits |

---

## Templates

**Web App** — React 19, TypeScript 5.9, Vite 7, Tailwind v4, shadcn/ui, TanStack Query v5, React Hook Form + Zod, React Router v7, Express v5, better-sqlite3, JWT auth, nodemailer, Vitest, Playwright.

**Website** — PHP (procedural or simple MVC), MySQL via PDO, Tailwind CSS, standard folder layout (`public/`, `src/`, `templates/`, `config/`).

---

## Contributing

This project is currently for personal use. Open-source release planned — contributions welcome once public.

## License

MIT
