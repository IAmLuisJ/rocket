# Rocket CLI — Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-03-21
**Author:** Luis Juarez
**Status:** Draft

---

## 1. App Overview & Objectives

Rocket is a Node.js CLI tool that does two things: bootstraps new projects from opinionated starter templates, and runs an AI-powered development loop (Rocket Loop) that drives autonomous, iterative coding work directly in the terminal.

**Primary objectives:**
- Reduce project setup time from hours to seconds with battle-tested templates
- Replace manual, repetitive AI prompting with a persistent, observable loop that runs until tasks are done
- Support both Claude (docker sandbox) and GitHub Copilot CLI as AI backends
- Provide a best-in-class terminal UX via an Ink-based TUI

**Non-goals (v1.0):**
- Web UI or dashboard
- Cloud sync of tasks or history
- Multi-project orchestration
- Windows support (macOS and Linux only)

---

## 2. Target Audience

- Solo developers working on personal or early-stage projects
- Developers already using Claude Code CLI or GitHub Copilot CLI
- Teams who want a reproducible, scriptable AI development workflow
- Primary user: Luis Juarez (personal use, open-source later)

---

## 3. Success Metrics & KPIs

| Metric | Target |
|--------|--------|
| Time to scaffold new project | < 30 seconds |
| Rocket Loop: task completion without manual intervention | ≥ 70% of tasks |
| CLI startup time | < 500ms |
| npm install success rate | 100% (no native deps) |
| Blocked/Decide interruptions per session | ≤ 2 |

---

## 4. Competitive Analysis

| Tool | Strengths | Weaknesses vs Rocket |
|------|-----------|----------------------|
| `create-react-app` / `create-vite` | Well-known, fast | No loop, no full-stack templates |
| `ralph.sh` (pageai) | Proven AI loop concept | Bash-only, docker-required, no TUI, no task selection |
| GitHub Copilot CLI | Native Copilot integration, autonomous | No loop scaffolding, no project templates |
| Nx / Turborepo | Monorepo power | Complex, overkill for solo/small projects |
| `degit` | Simple template cloning | No interactivity, no loop |

**Rocket's edge:** combines scaffolding + AI loop + TUI + multi-backend support in a single `npm install -g` package. Uniquely, Rocket also provides in-place PRD + task generation via `rocket feature` — no other scaffolding CLI lets you describe a feature in natural language and have it automatically spec'd, diff-previewed, and appended to your live PRD and task list without leaving the terminal.

---

## 5. Core Features

### 5.1 `rocket new` — Project Scaffolding

Interactively scaffolds a new project from one of two templates.

**Project types:**

#### Type A: Web App (React + Express)
Based on the community-events stack:
- Frontend: React 19, TypeScript 5.9, Vite 7, Tailwind v4, shadcn/ui
- State: TanStack Query v5, React Hook Form + Zod
- Routing: React Router v7
- Backend: Express v5, better-sqlite3, JWT auth, nodemailer
- Testing: Vitest + @testing-library, Playwright
- Config: composite tsconfig, `@/*` path alias, ESLint

#### Type B: Website (PHP + MySQL)
Based on the ReverseSend stack:
- PHP (procedural or simple MVC)
- MySQL via PDO
- Tailwind CSS (CDN or build step)
- Basic folder structure: public/, src/, templates/, config/

**Scaffolding flow:**
1. `rocket new <project-name>` (or `rocket new` for interactive name prompt)
2. TUI prompt: select project type (Web App | Website)
3. For Web App: optional feature toggles (include auth? include PDF renderer? include email?)
4. Rocket scaffolds the folder, installs dependencies, initializes git, creates `.agent/` directory
5. Success screen with next steps

**Generated `.agent/` structure:**
```
.agent/
  prd/
    PRD.md          # Placeholder for user's PRD
    SUMMARY.md      # Auto-generated project summary
  logs/
    LOG.md          # Loop progress log
  history/          # Per-iteration output history
  PROMPT.md         # Loop prompt instructions
  tasks.json        # Implementation task list
```

---

### 5.2 `rocket loop` — AI Development Loop (Rocket Loop)

A persistent, observable AI loop that reads tasks from `.agent/tasks.json`, selects a focus task, and drives an AI agent to complete it iteratively.

**Backends supported:**
| Backend | Command | Flag |
|---------|---------|------|
| Copilot CLI (default) | `copilot --autopilot --prompt "..."` | _(default)_ |
| Claude (direct, no docker) | `claude --model opus -p "..."` | `--claude` |
| Claude (docker sandbox) | `docker sandbox run claude . -- --model opus -p "..."` | `--docker` |

**Loop flow:**
1. `rocket loop` launches the TUI
2. Task selection screen: reads `.agent/tasks.json`, shows incomplete tasks, user selects focus task (or selects "Auto — pick next incomplete")
3. Loop runs: AI agent iterates on the task, Rocket monitors output
4. Per-iteration: spinner + rolling preview of AI output, step timing, task status updates
5. Exit conditions: `<complete>` tag (task done), `<blocked>` tag (needs human), `<decide>` tag (needs decision), max iterations reached
6. Completion report: summary of what was done, files changed, time elapsed, per-step timing

**macOS caffeinate:** On macOS, Rocket automatically runs `caffeinate -i` as a background process during the loop to prevent sleep. Cleaned up on exit.

**History:** Each iteration's output is saved to `.agent/history/ITERATION-{SESSION_ID}-{i}.txt` (ANSI-stripped).

**Progress log:** Loop progress is appended to `.agent/logs/LOG.md` after each session.

---

### 5.3 `rocket tasks` — Task Management (v1 lite)

A simple read-only TUI view of `.agent/tasks.json`:
- Filter by status (incomplete / complete / blocked)
- Display task details and pass criteria
- Mark tasks complete manually (for tasks completed outside the loop)

---

### 5.4 `rocket init` — Initialize Agent Structure

Initializes the `.agent/` directory in an existing project:
- Creates `.agent/prd/PRD.md` (placeholder)
- Creates `.agent/PROMPT.md` (default loop prompt)
- Creates `.agent/tasks.json` (empty task list)
- Creates `.agent/logs/LOG.md`

---

### 5.5 `rocket feature` — AI-Powered Feature Spec & Task Generation

Accepts a natural language feature description, runs it through an AI-powered clarification and spec workflow (modeled on the prd-creator skill), updates the project PRD, and generates new tasks appended to `.agent/tasks.json`.

**Usage:**
```
rocket feature "Add user authentication with JWT"
rocket feature  # launches interactive description prompt if no arg given
```

**Flow:**
1. Accept feature description as CLI argument or interactive text prompt
2. Read existing `.agent/prd/PRD.md` and `.agent/tasks.json` for context
3. Run a clarification loop in the TUI — ask 3–5 targeted questions about the feature (scope, edge cases, UI needed, API changes, dependencies on existing tasks)
4. Once answers are collected, call the configured AI backend to:
   - Generate a feature spec section (objectives, user story, acceptance criteria, technical notes)
   - Produce a list of new tasks in tasks.json format
   - Identify any existing PRD sections that need updating
5. Show a diff-style preview of PRD changes and new tasks list in the TUI
6. Prompt: **Apply changes? [Yes / Edit / Cancel]**
7. On confirm: append the feature spec to PRD.md under a `## Features Added` section (or merge into the relevant existing section), and append new tasks to tasks.json with IDs continuing from the current max ID
8. Print a summary: feature name, N tasks added, PRD section updated

**Clarification questions (dynamic, AI-generated based on feature description, but seeded with):**
- What problem does this feature solve?
- Who is the primary user of this feature?
- Are there UI components needed, or is this backend-only?
- Does this depend on any existing tasks or features?
- Any known edge cases or constraints?

**AI prompt strategy:**
Rocket sends the existing PRD + feature description + user answers to the AI backend with a structured prompt instructing it to output:
1. A feature spec block (markdown)
2. A JSON array of tasks following the existing tasks.json schema
The output is parsed and applied — no manual editing of raw AI output required.

**Flags:**
| Flag | Description |
|------|-------------|
| `--no-questions` | Skip clarification, generate spec from description alone |
| `--dry-run` | Show preview but don't write changes |
| `--backend <name>` | Override AI backend for this command (copilot \| claude \| docker) |

### 5.6 `rocket status` — Project Progress Dashboard

Displays a real-time TUI dashboard showing overall project progress, current task in focus, and a breakdown by category — all derived from `.agent/tasks.json` and `.agent/logs/LOG.md`.

**Usage:**
```
rocket status
rocket status --watch   # auto-refresh every 5s
rocket status --json    # output raw JSON for scripting
```

**Dashboard layout (Ink TUI):**

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

**Data sources:**
- Task counts and `passes` status → `.agent/tasks.json`
- Current focus task → `.agent/logs/LOG.md` (last active task entry)
- Loop session stats → `.agent/history/` (count files, parse durations)
- Recent activity → last N entries in `.agent/logs/LOG.md`

**Progress calculations:**
- Overall: `(tasks where passes === true) / total tasks * 100`
- By category: same calc per category group
- Progress bar: Unicode block chars (█ / ░), width scales to terminal width

**`--watch` mode:** Re-renders dashboard every 5 seconds using Ink's re-render. Reads files fresh each tick. Press `q` to exit.

**`--json` flag:** Skips TUI, outputs structured JSON to stdout:
```json
{
  "overall": { "complete": 74, "total": 120, "percent": 62 },
  "currentTask": { "id": 42, "title": "...", "category": "api-endpoint" },
  "byCategory": { "config": { "complete": 10, "total": 10 }, ... },
  "loopSessions": 3,
  "totalRuntimeSeconds": 5040
}
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--watch` | Auto-refresh every 5 seconds |
| `--json` | Output JSON instead of TUI |
| `--category <name>` | Show only tasks in a specific category |
| `--incomplete` | List all incomplete tasks with IDs and titles |

---

## 6. User Flows

### Flow 1: New Web App Project
```
$ rocket new my-saas
  ✦ What type of project? › Web App (React + Express)
  ✦ Include auth (JWT)? › Yes
  ✦ Include email (nodemailer)? › Yes
  ✦ Include PDF renderer? › No
  ⚡ Scaffolding my-saas...
  📦 Installing dependencies...
  🔧 Initializing git...
  ✅ Done! cd my-saas && rocket loop
```

### Flow 2: Run Rocket Loop (default — Copilot CLI)
```
$ rocket loop
  ┌─────────────────────────────────────┐
  │  🚀 Rocket Loop                     │
  │  Project: my-saas                   │
  │  Backend: Copilot CLI               │
  ├─────────────────────────────────────┤
  │  Select task to focus on:           │
  │  ○ Auto — pick next incomplete      │
  │  ● [#12] Add user registration form │
  │  ○ [#13] Set up JWT middleware      │
  │  ○ [#14] Create /api/auth endpoints │
  └─────────────────────────────────────┘

  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ↪ Iteration 1 of 10 · Task #12
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⠋ Editing src/components/RegisterForm.tsx...
```

### Flow 3: Run with Docker Sandbox
```
$ rocket loop --docker
```

### Flow 4: Init in Existing Project
```
$ cd my-existing-project
$ rocket init
  ✅ Created .agent/ structure
  📝 Edit .agent/prd/PRD.md with your requirements
  📋 Edit .agent/tasks.json with your task list
  ▶  Then run: rocket loop
```

### Flow 5: Add a Feature via `rocket feature`
```
$ rocket feature "Add dark mode toggle"

  ✦ Rocket Feature Wizard
  ─────────────────────────────────────
  Feature: "Add dark mode toggle"

  Clarifying questions:

  ✦ Who is this for? (e.g., end user, admin) › End user
  ✦ UI components needed? › Yes — toggle in nav bar
  ✦ Backend changes required? › No, CSS/theme only
  ✦ Dependencies on existing tasks? › Task #8 (shadcn setup)
  ✦ Known constraints? › Must respect system preference by default

  ⚡ Generating feature spec and tasks...

  ┌─ PRD Update Preview ──────────────────────────┐
  │ + ## Dark Mode Toggle                          │
  │ + **User story:** As a user, I want to...      │
  │ + **Acceptance criteria:** ...                 │
  └────────────────────────────────────────────────┘
  ┌─ New Tasks (4) ───────────────────────────────┐
  │ #111 Add next-themes provider to app root      │
  │ #112 Create ThemeToggle component              │
  │ #113 Add toggle to NavBar                      │
  │ #114 Test system preference detection          │
  └────────────────────────────────────────────────┘

  Apply changes? › Yes

  ✅ PRD updated · 4 tasks added · tasks.json updated
```

### Flow 6: Check Project Status
```
$ rocket status

  🚀 Rocket Status · my-saas
  ─────────────────────────────
  Overall:  62%  ████████████████░░░░░  74/120

  config      100% ██████████  10/10
  functional   80% ████████░░   8/10
  ui-ux        50% █████░░░░░   5/10
  ...

  Focus:  #42 · Add JWT middleware  [api-endpoint]

  Recent: ✅ #40 ✅ #41 🔄 #42
```

---

## 7. Technical Architecture

### Stack
- **Runtime:** Node.js 22+
- **Language:** TypeScript
- **CLI framework:** Commander.js (command routing, help, flags)
- **TUI:** Ink v5 (React for terminals) + ink-select-input + ink-spinner + ink-text-input
- **Process management:** Node.js `child_process` (spawn) for AI backends
- **File I/O:** `fs-extra`
- **JSON handling:** Native JSON + zod for schema validation
- **Templates:** Embedded in package (no network fetch at scaffold time)
- **Package manager:** npm

### Project Structure
```
rocket/
  bin/
    rocket.ts         # CLI entry point
  src/
    commands/
      new.ts          # rocket new
      loop.ts         # rocket loop
      init.ts         # rocket init
      tasks.ts        # rocket tasks
      feature.ts      # rocket feature
      status.ts       # rocket status
    tui/
      components/
        TaskSelector.tsx
        IterationHeader.tsx
        SpinnerPreview.tsx
        CompletionReport.tsx
        BlockedScreen.tsx
        DecideScreen.tsx
        NewProjectWizard.tsx
        FeatureWizard.tsx
        FeatureDiffPreview.tsx
        StatusDashboard.tsx  # Full status dashboard layout
        ProgressBar.tsx      # Unicode block progress bar component
      themes/
        colors.ts
    lib/
      backends/
        copilot.ts    # Copilot CLI spawner
        claude.ts     # Claude direct spawner
        docker.ts     # Docker sandbox spawner
      parser/
        jsonStream.ts # Parse AI JSON stream output
        tags.ts       # Detect <complete>, <blocked>, <decide>
      tasks/
        reader.ts     # Read/write tasks.json
        schema.ts     # Zod schema for tasks
      feature/
        clarifier.ts      # Generate clarifying questions via AI
        specGenerator.ts  # Assemble prompt + call AI + parse response
        taskMerger.ts     # Append new tasks to tasks.json with correct IDs
        prdWriter.ts      # Append/merge feature spec into PRD.md
        prompts.ts        # AI prompt templates for spec generation
      progress/
        calculator.ts     # Compute overall + per-category progress stats
        logReader.ts      # Parse recent activity from LOG.md
        historyReader.ts  # Count sessions + compute total runtime from history/
      history.ts      # Save iteration history
      caffeinate.ts   # macOS caffeinate manager
      log.ts          # Progress log writer
      preflight.ts    # Pre-run checks
    templates/
      webapp/         # React+Express template files
      website/        # PHP+MySQL template files
  package.json
  tsconfig.json
```

### AI Backend Interface
Each backend implements a common `AgentBackend` interface:
```typescript
interface AgentBackend {
  name: string;
  spawn(prompt: string, options: BackendOptions): ChildProcess;
  parseOutput(line: string): ParsedOutput | null;
}
```

### tasks.json Schema
```typescript
interface Task {
  id: number;
  title: string;
  description: string;
  category: 'functional' | 'ui-ux' | 'api-endpoint' | 'security' | 'testing' | 'config';
  passes: boolean;
  passCondition: string;
  blockedReason?: string;
}
```

---

## 8. TUI Design Principles

- **Ink (React for terminals)** — component-based, testable, familiar
- **Color palette:** Cyan for brand, Yellow for timing/counts, Green for success, Red for errors, Magenta for highlights
- **Clear visual hierarchy:** thick border bars (▓▓▓) between sections, inherited from ralph.sh
- **Non-blocking spinner** with rolling preview of AI output (last 3-5 lines)
- **Task focus always visible** in iteration header
- **Completion report** shows: task title, files changed (if detectable), iteration count, total time, per-step breakdown
- **Keyboard shortcuts:** `q` to quit gracefully, `s` to skip to next iteration, `p` to pause

---

## 9. Security Considerations

- No API keys stored by Rocket — auth is delegated to the AI backend (Copilot CLI uses GitHub auth, Claude uses its own auth)
- Templates do not include hardcoded credentials (unlike the ReverseSend DB config anti-pattern)
- Templates include `.env.example` and `.gitignore` with sensible defaults
- No network calls during scaffolding (templates are bundled)
- Process cleanup on exit (no orphaned AI agent processes)

---

## 10. Assumptions & Dependencies

| Assumption | Impact if wrong |
|-----------|-----------------|
| User has Node.js 22+ installed | CLI won't run — add preflight check |
| Copilot CLI (`copilot`) is in PATH for default mode | Loop won't start — show install instructions |
| `docker` in PATH for `--docker` mode | docker mode unavailable — clear error message |
| `claude` in PATH for `--claude` mode | claude mode unavailable — clear error message |
| macOS for caffeinate (Linux graceful skip) | No caffeinate on Linux — non-fatal, skip silently |
| Project has `.agent/tasks.json` for `rocket loop` | Loop won't start — prompt user to run `rocket init` |
| AI backends output stream-json format | Parser will fail — backend-specific parsers handle format differences |

---

## 11. Implementation Phases

### Phase 1 — Core Scaffold (MVP)
- `rocket new` with Web App template
- Basic file copy + `npm install` + git init
- `.agent/` directory creation
- Publish to npm as `rocket-cli` or `@luisjuarez/rocket`

### Phase 2 — Rocket Loop (Core)
- Copilot CLI backend
- Task selection TUI
- Per-iteration spinner + preview
- `<complete>` / `<blocked>` / `<decide>` detection
- History saving, progress log
- macOS caffeinate

### Phase 3 — Multi-Backend + Website Template
- Claude direct backend (`--claude`)
- Docker sandbox backend (`--docker`)
- PHP/MySQL website template
- `rocket tasks` view

### Phase 4 — Polish + Open Source
- Improved completion reports
- Per-step timing breakdown in TUI
- `rocket init` command
- README, docs, contributing guide
- GitHub Actions CI

---

## 12. Open Questions

- [ ] Should `rocket new` fetch template updates from GitHub, or always use bundled templates?
- [ ] How does Copilot CLI's `--autopilot` flag interact with stream-json output? Needs testing.
- [ ] Should `rocket loop` support resuming a previous session (re-reading history)?
- [ ] What's the right task selection UX when there are 100+ tasks — search/filter or pagination?
- [ ] Should `.agent/` be committed to git or `.gitignore`d by default?
- [ ] Should `rocket feature` support batch mode — reading a list of features from a file?
- [ ] Should spec generation use a separate "planning" AI call before task generation, or do it in one shot?
- [ ] Should `rocket status` show a timeline/burndown chart of tasks completed per loop session?
