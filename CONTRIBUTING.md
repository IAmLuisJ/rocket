# Contributing to Rocket

## Overview

Rocket is a CLI tool that does two things: scaffold new projects from templates (`rocket new`), and run an AI-powered development loop against a task list (`rocket loop`). The entry point is `bin/rocket.ts`, commands are registered in `src/cli.ts`, and everything substantial lives under `src/lib/` and `src/tui/`. Start by reading this file, then `src/cli.ts`, then follow whichever path below matches what you want to change.

See `README.md` for user-facing documentation.

---

## Project Structure

```
Rocket/
├── bin/
│   └── rocket.ts                  # CLI entry: preflight node version check, registers SIGINT/unhandledRejection handlers, calls program.parseAsync()
├── src/
│   ├── cli.ts                     # Registers all Commander commands (new, loop, feature, status, tasks, init) with lazy dynamic imports
│   ├── commands/
│   │   ├── new.ts                 # runNew(): renders NewProjectWizard Ink component
│   │   ├── loop.ts                # runLoop(): preflight, loads tasks, starts caffeinate, renders RocketLoop Ink component
│   │   ├── init.ts                # runInit(): calls createAgentStructure() for existing projects
│   │   ├── feature.ts             # runFeature(): AI-assisted feature spec generation and task merging
│   │   ├── status.ts              # runStatus(): renders StatusApp with task progress dashboard
│   │   └── tasks.ts               # runTasks(): renders TasksApp for task list view with --filter
│   ├── tui/
│   │   ├── RocketLoop.tsx         # Root Ink component for the loop: manages phase state machine (selecting → running → done), drives the iteration loop, coordinates all child components
│   │   └── components/
│   │       ├── NewProjectWizard.tsx    # Multi-step Ink wizard: name → type → features → scaffolding → done
│   │       ├── TaskSelector.tsx        # Ink component: renders incomplete task list using ink-select-input, calls onSelect callback
│   │       ├── IterationView.tsx       # Ink component: live display of current iteration, elapsed time, last 4 output lines, spinner
│   │       ├── CompletionReport.tsx    # Ink component: renders outcome-specific summary (complete/blocked/decide/max-iterations)
│   │       ├── StatusApp.tsx           # Dashboard showing task completion counts and category breakdown
│   │       ├── TasksApp.tsx            # Filterable task list view
│   │       ├── FeatureWizard.tsx       # Multi-step wizard for `rocket feature`
│   │       ├── FeatureDiffPreview.tsx  # Shows diff preview for new tasks before writing
│   │       └── ProgressBar.tsx         # Reusable progress bar component
│   └── lib/
│       ├── scaffold.ts            # scaffold(): copies template via processTemplate(), calls createAgentStructure(), runs npm install + git init
│       ├── agent-init.ts          # createAgentStructure() for `rocket init` (standalone, checks if already initialized)
│       ├── template-engine.ts     # processTemplate(): recursive directory copy with {{TOKEN}} substitution, strips .tmpl extension from filenames
│       ├── prompt.ts              # buildLoopPrompt(): reads .agent/PROMPT.md and injects task context; getDefaultPromptContent()
│       ├── preflight.ts           # checkNodeVersion(), checkAgentStructure() (validates .agent/tasks.json + PRD.md + PROMPT.md exist), checkBackendAvailability()
│       ├── history.ts             # saveIterationHistory(): writes ANSI-stripped output to .agent/history/ITERATION-<sessionId>-<n>.txt
│       ├── log.ts                 # ensureLogFile(), appendLogEntry(): appends structured markdown entries to .agent/logs/LOG.md
│       ├── caffeinate.ts          # startCaffeinate() / stopCaffeinate(): spawns macOS `caffeinate -i` to prevent sleep during loop
│       ├── backends/
│       │   ├── types.ts           # AgentBackend interface, BackendOptions, ParsedOutput types
│       │   ├── index.ts           # getBackend(): returns copilot (default), claude (--claude), or docker (--docker)
│       │   ├── tags.ts            # hasCompleteTag/hasBlockedTag/hasDecideTag regex checks; extractBlockedReason/extractDecideQuestion
│       │   ├── copilot.ts         # copilotBackend: spawns `copilot --autopilot --prompt <prompt>`, passes lines through verbatim
│       │   ├── claude.ts          # claudeBackend: spawns `claude --model opus --output-format stream-json --verbose --dangerously-skip-permissions -p <prompt>`, parses JSON stream
│       │   └── docker.ts          # dockerBackend: spawns docker sandbox command via script(1) on macOS or bash on Linux; same JSON stream parsing as claude; detects docker-specific plain-text errors
│       ├── tasks/
│       │   ├── schema.ts          # Zod schemas: TaskSchema, TasksFileSchema, TaskCategorySchema; exports Task and TasksFile types
│       │   └── reader.ts          # readTasks() (reads + Zod-parses tasks.json), writeTasks(), getIncompleteTasks(), getMaxTaskId()
│       ├── feature/
│       │   ├── prompts.ts         # Prompt templates for feature spec generation
│       │   ├── clarifier.ts       # Asks clarifying questions before generating spec
│       │   ├── specGenerator.ts   # Calls AI backend to generate feature spec
│       │   ├── taskMerger.ts      # Merges new tasks into existing tasks.json without duplicates
│       │   └── prdWriter.ts       # Updates .agent/prd/PRD.md with new feature spec
│       ├── progress/
│       │   ├── calculator.ts      # Computes completion percentages and category stats from task arrays
│       │   ├── logReader.ts       # Parses .agent/logs/LOG.md entries
│       │   └── historyReader.ts   # Lists and reads .agent/history/ iteration files
│       └── parser/
│           └── jsonStream.ts      # Utility for parsing newline-delimited JSON streams
├── templates/
│   ├── webapp/                    # React + Express template (see below for full tree)
│   └── website/                   # PHP + MySQL template
├── package.json                   # "rocket-cli"; bin points to dist/bin/rocket.js; build script copies package.json to dist/
├── tsconfig.json                  # Base config (noEmit: true) — used for typecheck only
└── tsconfig.build.json            # Extends base; sets outDir: dist, noEmit: false — used for npm run build
```

---

## How `rocket new` Works

### Entry point

```
rocket new my-app --type webapp
  └─ bin/rocket.ts              checkNodeVersion(), program.parseAsync()
       └─ src/cli.ts            'new [project-name]' action → dynamic import('./commands/new.js')
            └─ runNew()         src/commands/new.ts:5
                 └─ render(<NewProjectWizard initialName="my-app" initialType="webapp" />)
                      └─ doScaffold()  src/tui/components/NewProjectWizard.tsx:63
                           └─ scaffold('webapp', 'my-app', '/cwd/my-app', opts)
                                └─ src/lib/scaffold.ts:33
```

`runNew(projectName, opts)` (`src/commands/new.ts:5`) renders the `NewProjectWizard` Ink component and awaits `waitUntilExit()`. All logic happens inside the component.

### Web template: what gets copied

The `webapp` template lives at `templates/webapp/` and contains:

```
templates/webapp/
├── package.json.tmpl              # Root package.json with {{PROJECT_NAME}} substituted
├── .gitignore.tmpl                # .gitignore (stripped of .tmpl suffix on copy)
├── .env.example                   # Environment variable template
├── docker-compose.yml             # Docker Compose for local dev
├── drizzle.config.ts              # Drizzle ORM config
├── client/
│   ├── package.json.tmpl          # Client package.json with {{PROJECT_NAME}}
│   ├── index.html                 # Vite entry HTML
│   ├── vite.config.ts             # Vite config
│   ├── tailwind.config.js         # Tailwind config
│   ├── eslint.config.js           # ESLint config
│   ├── tsconfig.json              # Client root tsconfig
│   ├── tsconfig.app.json          # App tsconfig
│   ├── tsconfig.node.json         # Node tsconfig for Vite config
│   ├── .env.example               # Client env vars
│   └── src/
│       ├── main.tsx               # React entry point
│       ├── App.tsx                # Root App component
│       ├── index.css              # Global styles (Tailwind directives)
│       └── test/
│           └── setup.ts           # Vitest setup file
└── server/
    ├── package.json.tmpl          # Server package.json with {{PROJECT_NAME}}
    ├── tsconfig.json              # Server tsconfig
    ├── .env.example               # Server env vars
    └── src/
        ├── index.ts               # Express server entry
        └── db/
            ├── schema.ts          # Drizzle schema
            └── index.ts           # DB connection
```

The `website` template at `templates/website/` contains a PHP + MySQL structure:

```
templates/website/
├── .env.example
├── public/
│   └── index.php                  # PHP entry point
├── config/
│   └── database.php               # DB connection config
└── templates/
    └── layout.php                 # Base PHP layout
```

### Adding or changing template files

1. Edit the file directly under `templates/webapp/` (or `templates/website/`).
2. Use `{{PROJECT_NAME}}` anywhere you need the sanitized project name substituted at scaffold time. Token substitution is handled by `replaceTokens()` in `src/lib/template-engine.ts:26`.
3. If the output filename should drop its source extension, name it `filename.ext.tmpl` — `processTemplate()` strips the `.tmpl` suffix (`src/lib/template-engine.ts:43`). For example, `package.json.tmpl` becomes `package.json`.
4. Binary files (`.png`, `.jpg`, `.svg`, `.woff`, etc. — see `BINARY_EXTENSIONS` at `template-engine.ts:4`) are copied verbatim without token substitution.
5. To test your change:
   ```bash
   npm run build
   node dist/bin/rocket.js new test-app --type webapp
   ls -la test-app/
   # inspect the scaffolded output
   rm -rf test-app/   # clean up
   ```

### How `.agent/` is initialized

After the template files are copied, `scaffold()` calls `createAgentStructure(destPath, projectName)` (defined locally in `src/lib/scaffold.ts:68`). This function creates:

| File | Content |
|------|---------|
| `.agent/prd/PRD.md` | Blank PRD template with `# <projectName> — Product Requirements Document` header |
| `.agent/prd/SUMMARY.md` | Blank summary template with `# <projectName> — Summary` header |
| `.agent/logs/LOG.md` | `# Development Log\n` |
| `.agent/PROMPT.md` | Default agent instructions referencing the project name — tells the agent to read `tasks.json`, emit `<complete>`, `<blocked>`, or `<decide>` |
| `.agent/tasks.json` | `{ "tasks": [] }` |

The directories `.agent/prd/`, `.agent/logs/`, and `.agent/history/` are all created with `mkdir(..., { recursive: true })`.

Note: `src/lib/agent-init.ts` contains a parallel `createAgentStructure()` used by `rocket init`. It has the same structure but omits the project-name-specific header text and first checks for an existing `tasks.json` to prevent double-initialization.

### How skills get copied

There is currently no `templates/shared/skills/` directory in the repo — skills are not automatically copied during `rocket new`. If you need to add a shared skills layer, you would:

1. Create `templates/shared/skills/` with the skill files.
2. Add a `cpSync` call in `scaffold()` (`src/lib/scaffold.ts`) after `processTemplate()` completes, copying `join(getTemplatesDir(), 'shared/skills')` to `join(destPath, '.agent', 'skills')`.

### Adding a new project type

To add a third template type (e.g., `api-only`):

1. **New template directory**: create `templates/api-only/` with whatever files the scaffold should contain.

2. **`NewProjectWizard.tsx`**: add an entry to the `PROJECT_TYPES` array (`src/tui/components/NewProjectWizard.tsx:17`):
   ```ts
   const PROJECT_TYPES = [
     { label: 'Web App (React + Express)', value: 'webapp' },
     { label: 'Website (PHP + MySQL)', value: 'website' },
     { label: 'API Only (Express + Drizzle)', value: 'api-only' },  // add this
   ]
   ```
   Also update `handleTypeSelect()` (`line 50`) if the new type should show the feature-toggles step — currently only `webapp` does; all other types call `doScaffold` immediately after type selection.

3. **`src/cli.ts`**: update the `--type` option description (`line 23`) to mention the new value:
   ```ts
   .option('-t, --type <type>', 'Project type: webapp, website, or api-only')
   ```

4. **`runNew`** in `src/commands/new.ts` doesn't need changes — it passes `opts.type` straight through to the wizard.

---

## How `rocket loop` Works

### Entry point

```
rocket loop --claude --auto --max-iterations 5
  └─ bin/rocket.ts              checkNodeVersion(), SIGINT handler, program.parseAsync()
       └─ src/cli.ts            'loop' command action → dynamic import('./commands/loop.js')
            └─ runLoop(opts)    src/commands/loop.ts:13
                 ├─ validates maxIterations
                 ├─ checks .agent/ directory exists
                 ├─ writes default PROMPT.md if missing
                 ├─ checkAgentStructure(projectRoot)    → src/lib/preflight.ts:21
                 ├─ checkBackendAvailability()           → src/lib/preflight.ts:48
                 ├─ getBackend(opts)                  → src/lib/backends/index.ts:9
                 ├─ readTasks(projectRoot)               → src/lib/tasks/reader.ts:10
                 ├─ startCaffeinate()                    → src/lib/caffeinate.ts:6
                 ├─ ensureLogFile(projectRoot)           → src/lib/log.ts:4
                 └─ render(<RocketLoop ... />)           → src/tui/RocketLoop.tsx
                      └─ await waitUntilExit()
                           finally: stopCaffeinate()
```

### Preflight checks

`checkAgentStructure(projectRoot)` (`src/lib/preflight.ts:21`) verifies that all three paths exist:
- `.agent/tasks.json`
- `.agent/prd/PRD.md`
- `.agent/PROMPT.md`

If any are missing it returns `{ ok: false, errors: [...] }`. `runLoop` prints each error message and exits.

`checkBackendAvailability()` (`src/lib/preflight.ts:48`) runs `which <binary>` (via `execSync`) for `copilot`, `claude`, and `docker` and returns `{ copilot: boolean, claude: boolean, docker: boolean }`. `runLoop` cross-checks the requested backend flag against this result and exits with a specific install instruction if the binary is absent.

### Task selection phase

`RocketLoop` (`src/tui/RocketLoop.tsx:36`) initializes `phase` state to `'selecting'`, or to `'running'` if `auto` is true.

When `phase === 'selecting'`, it renders `<TaskSelector>` (`src/tui/components/TaskSelector.tsx`). `TaskSelector` filters the task array to entries where `!t.passes`, builds an `items` list with an "Auto — pick next incomplete task" option prepended, and renders an `ink-select-input` `<SelectInput>`. When the user picks an item, `handleSelect()` calls `onSelect(task | null)`.

Back in `RocketLoop`, `handleTaskSelect(task)` (`line 76`) stores the task in `focusTaskRef.current`, updates `focusTask` state, and calls `setPhase('running')`, which triggers the main `useEffect`.

With `--auto`, `RocketLoop` skips `TaskSelector` entirely: it pre-sets `focusTask` to `getIncompleteTasks(tasks)[0]` and initializes `phase` directly to `'running'`.

### The iteration loop

The `useEffect` at `src/tui/RocketLoop.tsx:83` fires when `phase` transitions to `'running'`. It runs `runAllIterations()`, which calls `runIteration(iter)` up to `maxIterations` times in series.

**1. Building the prompt** (`buildLoopPrompt` in `src/lib/prompt.ts:5`):
Reads `.agent/PROMPT.md` from disk. If `focusTask` is non-null, appends a `## Current Focus Task` section with the task's `id`, `title`, `description`, and `passCondition`, and instructs the agent to emit `<complete>`, `<blocked>`, or `<decide>`. If `focusTask` is null (auto mode), appends a generic "work on next incomplete task" instruction. Prepends `PROJECT_ROOT=<path>`. Returns the full prompt string.

**2. Selecting the backend** (`getBackend` in `src/lib/backends/index.ts:9`):
Priority: `--docker` → `dockerBackend`, `--claude` → `claudeBackend`, default → `copilotBackend`.

**3. Spawning the process** (`AgentBackend.spawn()` defined in `src/lib/backends/types.ts:18`):
Each backend implements `spawn(options: BackendOptions): ChildProcess`. Called at `RocketLoop.tsx:123` as `backend.spawn({ prompt, projectRoot })`. `stdio` is always `['ignore', 'pipe', 'pipe']`.

**4. Reading stdout line by line**:
`readline.createInterface({ input: proc.stdout })` (`RocketLoop.tsx:132`) emits a `'line'` event for each newline-terminated chunk of stdout.

**5. Parsing output lines**:
- `copilotBackend.parseOutputLine`: returns `{ text: line, ... }` for any non-empty line. No transformation applied.
- `claudeBackend.parseOutputLine`: calls `extractTextFromClaudeJson(line)` which JSON-parses each line and extracts text from `{ type: 'result', result: string }` events (final answer text) or `{ type: 'assistant', message: { content: [...] } }` events (streaming content blocks). Returns `null` for lines that aren't parseable JSON or don't match either event type.
- `dockerBackend.parseOutputLine`: same JSON parsing as claude, but first checks for plain-text error strings `'docker daemon not ready'` and `'Invalid API key'` and returns a synthetic `{ isBlocked: true }` result for each.

**6. Updating React state**:
Each parsed line is pushed to `accumulatedLines` (local array for later analysis) and appended to `outputLines` state via `setOutputLines(prev => [...prev, parsed.text])` (`RocketLoop.tsx:139`). `stepText` is set to the last non-empty parsed line, truncated to 100 characters (`line 141`). `IterationView` displays the last 4 lines of `outputLines` as a live tail.

**7. Detecting signal tags** (`src/lib/backends/tags.ts`):
After the process closes, `onClose()` (`RocketLoop.tsx:146`) joins `accumulatedLines` into `fullOutput` and checks the entire string:
- `hasCompleteTag(fullOutput)`: tests `/<complete>/i`
- `hasBlockedTag(fullOutput)`: tests `/<blocked>/i`
- `hasDecideTag(fullOutput)`: tests `/<decide>/i`

**8. State transition on tag found**:
If a tag is detected, `setOutcome(exitOutcome)`, `setBlockedReason(...)` / `setDecideQuestion(...)` (extracted by regex from the full output), `setPhase('done')`, and `resolve(true)` are all called. The `'done'` phase causes `RocketLoop` to render `<CompletionReport>`.

**9. Process exit without a tag**:
`resolve(false)` is returned. `runAllIterations` increments `iter` and calls `runIteration(iter + 1)` unless `maxIterations` is exhausted. After the final iteration, `setOutcome('max-iterations')` and `setPhase('done')` are set.

### Signal tags

The agent is expected to emit exactly one of these tags in its output to signal an outcome:

| Tag | Meaning | Exit path |
|-----|---------|-----------|
| `<complete>` | Task is done | `outcome: 'complete'` → green CompletionReport |
| `<blocked>reason</blocked>` | Agent needs human input | `outcome: 'blocked'`, reason extracted by `extractBlockedReason()` → red CompletionReport |
| `<decide>question</decide>` | Agent needs a decision | `outcome: 'decide'`, question extracted by `extractDecideQuestion()` → magenta CompletionReport |

If no tag appears after all iterations, outcome is `'max-iterations'` → yellow CompletionReport.

Example `PROMPT.md` instruction to the agent:
```
After completing the task, emit <complete> on its own line.
If you cannot proceed, emit <blocked>I need the database credentials</blocked>.
If you need a decision, emit <decide>Should I use JWT or sessions?</decide>.
```

Tag detection runs on the **full accumulated output** after process close, not line-by-line, so the tag can appear anywhere in the agent's final response.

### History and logging

**History** (`src/lib/history.ts:9` — `saveIterationHistory()`):
Called after each iteration's process closes. Writes the full accumulated output to:
```
.agent/history/ITERATION-<sessionId>-<iterationNumber>.txt
```
`sessionId` is an ISO timestamp with `:` and `.` replaced by `-`, sliced to 19 characters (e.g., `2024-01-15T14-30-00`). ANSI escape sequences are stripped via two regex passes before writing.

**Log** (`src/lib/log.ts:17` — `appendLogEntry()`):
Also called after each iteration. Appends a markdown section to `.agent/logs/LOG.md`:
```markdown
## Session <sessionId> · Iteration <n>
- **Time:** <ISO timestamp>
- **Task:** #<id> · <title>   (or "Auto" if no task was pinned)
- **Outcome:** complete | blocked | decide | max-iterations | iteration
- **Duration:** <n>s
- **Summary:** <last 300 chars of accumulated output>
```

### Completion report

`CompletionReport` (`src/tui/components/CompletionReport.tsx:28`) receives `{ outcome, task, iterations, totalMs, iterationStats, summary, blockedReason, decideQuestion }` and renders a different colored border + message block for each outcome:

| Outcome | Border color | Shown fields |
|---------|-------------|-------------|
| `complete` | green | task label, iteration count, total/avg time, last 200 chars of output |
| `blocked` | red | task label, `blockedReason`, iteration number stopped at, total time |
| `decide` | magenta | task label, `decideQuestion`, iteration number stopped at, total time |
| `max-iterations` | yellow | task label, total/avg time, hint to check LOG.md |

After rendering, `RocketLoop` shows "Press any key to exit" and calls `exit()` on any keypress via `useInput`.

### macOS caffeinate

`startCaffeinate()` (`src/lib/caffeinate.ts:6`) is called in `runLoop()` at `loop.ts:86` before rendering the TUI (skipped if `--no-caffeinate` is passed). It spawns `caffeinate -i` with `detached: false` so it dies with the parent process. On non-macOS platforms (`platform() !== 'darwin'`) it returns immediately without spawning anything.

`stopCaffeinate()` (`src/lib/caffeinate.ts:16`) is called in the `finally` block of `runLoop()` (`loop.ts:108`), guaranteeing it runs even if the TUI throws or the user presses Ctrl-C.

### AI backends

**Copilot** (`src/lib/backends/copilot.ts`):
```
copilot --autopilot --prompt <prompt>
```
stdout is plain text. `parseOutputLine` returns every non-empty line verbatim with signal-tag fields evaluated against each line.

**Claude** (`src/lib/backends/claude.ts`):
```
claude --model opus --output-format stream-json --verbose --dangerously-skip-permissions -p <prompt>
```
stdout is newline-delimited JSON. `parseOutputLine` passes each line to `extractTextFromClaudeJson()`, which extracts text from two event shapes:
- `{ type: 'result', result: string }` — final answer
- `{ type: 'assistant', message: { content: [{ type: 'text', text: string }] } }` — streaming content blocks

`--dangerously-skip-permissions` is required because `-p` (non-interactive) mode otherwise blocks waiting for TTY confirmation on file writes.

**Docker** (`src/lib/backends/docker.ts`):
```
docker sandbox run claude . -- --model opus --output-format stream-json --verbose -p "$ROCKET_PROMPT"
```
The prompt is passed via the `ROCKET_PROMPT` environment variable to avoid shell quoting issues. On macOS, the command is wrapped in `script -q /dev/null bash -c <cmd>` to provide a pseudo-TTY required by the Docker sandbox. On Linux it uses `bash -c <cmd>` directly. Same JSON stream parsing as the claude backend. Additionally detects `'docker daemon not ready'` and `'Invalid API key'` plain-text strings in output and synthesizes a `blocked` outcome for each without attempting JSON parsing.

### Adding a new backend

1. Create `src/lib/backends/mybackend.ts`. Implement the `AgentBackend` interface from `./types.js`:
   ```ts
   import { spawn } from 'child_process'
   import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'

   export const myBackend: AgentBackend = {
     name: 'My Backend',
     spawn(options: BackendOptions) {
       return spawn('mybinary', ['--prompt', options.prompt], {
         cwd: options.projectRoot,
         stdio: ['ignore', 'pipe', 'pipe'],
       })
     },
     parseOutputLine(line: string): ParsedOutput | null {
       if (!line.trim()) return null
       return { text: line, isComplete: false, isBlocked: false, isDecide: false }
     },
   }
   ```

2. Export and import it in `src/lib/backends/index.ts`, add a branch in `getBackend()`:
   ```ts
   import { myBackend } from './mybackend.js'

   export function getBackend(opts: { claude?: boolean; docker?: boolean; my?: boolean }): AgentBackend {
     if (opts.my) return myBackend
     if (opts.docker) return dockerBackend
     if (opts.claude) return claudeBackend
     return copilotBackend
   }
   ```

3. Add a CLI flag in `src/cli.ts` on the `loop` command:
   ```ts
   .option('--my', 'Use My Backend')
   ```

4. Add `my?: boolean` to `runLoop`'s `opts` type in `src/commands/loop.ts` and thread it through to `getBackend(opts)`.

5. Add binary availability checking in `runLoop()` following the existing pattern at `loop.ts:54–69`.

---

## Development Workflow

### Setup

```bash
git clone <repo-url>
cd Rocket
npm install
npm run build      # tsc -p tsconfig.build.json && cp package.json dist/package.json
```

### Local testing

Run commands without a global install:
```bash
node dist/bin/rocket.js new my-test --type webapp
node dist/bin/rocket.js loop --claude --auto --once
node dist/bin/rocket.js status
```

During active development, use `tsx` directly to skip the compile step:
```bash
npx tsx bin/rocket.ts new my-test --type webapp
npx tsx bin/rocket.ts loop --claude --auto --once
```

Or use watch mode to keep `tsx` running and pick up changes automatically:
```bash
npm run dev   # tsx watch bin/rocket.ts
```

### TypeScript

- **Type check only** (no output): `npm run typecheck` — uses `tsconfig.json` which has `noEmit: true`
- **Build** (emit to `dist/`): `npm run build` — uses `tsconfig.build.json` which extends the base config, sets `outDir: dist`, `noEmit: false`, and excludes `*.test.ts` files
- Both configs target ES2022, use NodeNext module resolution, and set `jsx: react-jsx`

### Running tests

```bash
npm test                  # vitest run
npm run test:coverage     # vitest run --coverage
```

Tests live alongside source files as `*.test.ts` or `*.test.tsx` and are excluded from build output by `tsconfig.build.json`.

### Adding a TUI component

All Ink components live in `src/tui/components/`. The project uses:
- `ink@4.4.1` — the version matters; see the gotcha below
- `ink-select-input@5.0.0` — keyboard-navigable list selector
- `ink-spinner@5.0.0` — animated spinner, used as `<Spinner type="dots" />`
- `ink-text-input@5.0.1` — single-line text input

Standard import pattern:
```ts
import { Box, Text, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
```

To render a new component as a command's root TUI:
```ts
// src/commands/mycommand.ts
import { render } from 'ink'
import React from 'react'
import { MyComponent } from '../tui/components/MyComponent.js'

export async function runMyCommand(opts: { ... }): Promise<void> {
  const { waitUntilExit } = render(React.createElement(MyComponent, { ...opts }))
  await waitUntilExit()
}
```

### Build + watch

```bash
npm run dev   # tsx watch bin/rocket.ts — restarts on any source change
```

---

## Common Gotchas

### `package.json` must be copied to `dist/` at build time

`src/cli.ts:8` reads `package.json` at runtime to get the CLI version:
```ts
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))
```
`__dirname` resolves to `dist/src/` at runtime, so `../package.json` resolves to `dist/package.json`. The build script handles this: `"build": "tsc -p tsconfig.build.json && cp package.json dist/package.json"`. If you run `tsc` directly without the `cp`, `rocket --version` will throw `ENOENT`.

### Template path resolution from compiled output

`src/lib/scaffold.ts:9` resolves the templates directory as:
```ts
function getTemplatesDir(): string {
  return join(__dirname, '../../templates')
}
```
At runtime `__dirname` is `dist/src/lib/`, so `../../templates` resolves to `templates/` in the repo root. This works because `templates/` is listed in the `"files"` array in `package.json` and is shipped alongside `dist/` when the package is published — it is never compiled into `dist/`. If you move `scaffold.ts` to a different directory depth, you must update this relative path accordingly.

### Ink requires a real TTY — `--auto` bypasses interactive selection for non-TTY use

`TaskSelector` uses `ink-select-input`, which requires keyboard input and a real TTY. In CI or piped contexts, pass `--auto` to skip `TaskSelector` entirely — `RocketLoop` starts directly in `'running'` phase with the first incomplete task.

### Claude CLI requires `--dangerously-skip-permissions` for file writes in `-p` mode

When using `-p` (non-interactive/print mode), Claude CLI blocks on any file system write that would normally require user confirmation. `claudeBackend` and `dockerBackend` both pass `--dangerously-skip-permissions` to bypass this. Without it, the agent process will hang waiting for confirmation that never arrives.

### `ink-select-input` and `ink-text-input` require `ink@4` (not `ink@5`)

The project pins `ink@4.4.1`. Both `ink-select-input@5` and `ink-text-input@5` declare `ink@^4` as a peer dependency and are not compatible with Ink 5's changed rendering model. If you see Ink-related type errors or runtime failures after updating dependencies, verify that you haven't pulled in `ink@5`.

---

## Development Setup

### Clone and install

```bash
git clone https://github.com/github/rocket-cli.git
cd rocket-cli
npm install
```

### Build the project

```bash
npm run build    # Runs tsc and copies package.json to dist/
```

### Run in development mode

```bash
npm run dev      # tsx watch bin/rocket.ts — hot-reloads on file changes
```

---

## Running Tests

```bash
npm test         # Runs Vitest in watch mode
npm test -- run  # Runs once and exits
```

Tests are located alongside source files with `.test.ts` extension. The test suite covers:
- Unit tests for libraries (backends, loop-runner, task readers, preflight checks)
- Integration tests for Ink components
- Mock-based testing for CLI commands

Run linting and formatting:

```bash
npx eslint --fix src/   # Auto-fix linting issues
npx prettier --write src/  # Format code
```

---

## Adding a New Template

Templates allow users to scaffold projects with `rocket new --type <template>`.

### Steps to add a template

1. **Create template directory**
   ```bash
   mkdir -p templates/mytemplate/
   ```

2. **Add template files**
   - Place project files in the template directory
   - Use `{{PLACEHOLDER}}` tokens for dynamic values (e.g., `{{PROJECT_NAME}}`, `{{DESCRIPTION}}`)
   - Add `.tmpl` extension to files that need token substitution (e.g., `package.json.tmpl`)
   - Plain files (without `.tmpl`) are copied as-is

3. **Register the template in code**
   - Update `src/lib/scaffold.ts` to add the template name to the `templateName` union type
   - Update `src/tui/components/NewProjectWizard.tsx` to add it to the template selection list

4. **Test the template**
   ```bash
   npm run dev
   # Run: rocket new myproject --type mytemplate
   ```

### Token replacement

The `template-engine.ts` processes files during scaffolding:
- `{{PROJECT_NAME}}` → project name
- `{{DESCRIPTION}}` → project description
- Other tokens can be added as needed

---

## Adding a New Backend

Backends enable Rocket to communicate with different AI services.

### Steps to add a backend

1. **Implement AgentBackend interface**
   Create `src/lib/backends/mybackend.ts`:
   ```typescript
   import type { AgentBackend } from './types.js'
   
   export const myBackend: AgentBackend = {
     name: 'My Backend',
     spawn(prompt: string, opts: any) {
       // Return a ChildProcess that outputs to stdout
       // Should be streaming lines or JSON
     },
     parseOutput(line: string) {
       // Parse and return { token: string } or null
     },
   }
   ```

2. **Register in backend selector**
   - Update `src/lib/backends/index.ts` in the `getBackend()` function
   - Add your backend to the selection logic

3. **Add CLI flag**
   - Update `src/cli.ts` loop command to register a flag (e.g., `--mybackend`)
   - Add the option to the handler's type signature

4. **Update documentation**
   - Document the backend in `README.md` 
   - Add setup instructions for users

5. **Test the backend**
   ```bash
   npm run build
   rocket loop --mybackend
   ```

---

## Pull Request Guidelines

1. **One logical change per PR**
   - If adding a feature and fixing a bug, split into two PRs
   - Keep related changes together

2. **Run tests and linting**
   ```bash
   npm test -- run
   npm run build
   npx eslint src/
   ```
   All must pass before submitting.

3. **Write clear commit messages**
   - Use Conventional Commit format: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
   - First line ≤ 50 chars, wrap body at 72 chars
   - Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer

4. **Add tests for new functionality**
   - Write tests alongside the code (same directory)
   - Aim for meaningful test coverage, not just line coverage

5. **Update docs if needed**
   - If changing behavior, update `README.md` or `CONTRIBUTING.md`
   - Update `CHANGELOG.md` for user-facing changes

---

## Code Style

### TypeScript

- Prefer **const** over let/var
- Use **strict mode** (tsconfig.json enforces this)
- Prefer **explicit types** in function signatures
- Avoid **any** — use `unknown` and narrow the type

### Naming

- File names: `kebab-case.ts`
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### Imports

- Use ESM imports (`import ... from '...'`)
- Use `.js` file extensions in import paths (for Node ESM compatibility)
- Group imports: React → libraries → local modules

### Ink/React components

- Props should be a single object (not spread parameters)
- Use functional components with hooks
- Component files: `PascalCase.tsx`

### Comments

- Only comment complex logic that isn't obvious
- Prefer clear naming over comments
- Keep comments up-to-date with code changes

### Formatting

- Linting: **ESLint** (npm run lint --fix)
- Formatting: **Prettier** (npm run format)
- Both tools run automatically on save if configured in your editor

---

For more information, see the [README.md](./README.md) for user documentation and architecture notes.
