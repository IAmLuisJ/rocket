# Project Structure

```
bin/
  rocket.ts              # CLI entry point

src/
  cli.ts                 # Commander.js program setup
  index.ts               # Package entry point
  commands/
    init.ts              # rocket init command
    loop.ts              # rocket loop command
    new.ts               # rocket new command
    status.ts            # rocket status command
    tasks.ts             # rocket tasks command
    feature.tsx          # rocket feature command
  lib/
    agent-init.ts        # .agent/ structure creation
    caffeinate.ts        # macOS caffeinate wrapper
    history.ts           # Iteration history management
    log.ts               # Log file utilities
    loop-runner.ts       # Core loop execution async generator
    preflight.ts         # Pre-loop validation checks
    prompt.ts            # Prompt builder for AI backends
    prompt-builder.ts    # Async prompt constructor (PROMPT.md + PRD + task)
    scaffold.ts          # Project scaffolding
    template-engine.ts   # Template variable substitution
    backends/
      claude.ts          # Claude direct backend
      copilot.ts         # GitHub Copilot CLI backend
      docker.ts          # Claude Docker sandbox backend
      index.ts           # Backend selection
      tags.ts            # Promise tag parser
      types.ts           # Backend type definitions
    feature/
      clarifier.ts       # Feature requirement clarification
      prdWriter.ts       # PRD generation
      prompts.ts         # Feature prompt templates
      specGenerator.ts   # Spec generation
      taskMerger.ts      # Task merging utilities
    parser/
      jsonStream.ts      # JSON stream parser
    progress/
      calculator.ts      # Progress calculation
      historyReader.ts   # History file reader
      logReader.ts       # Log file reader
    tasks/
      reader.ts          # Task file reader/writer
      schema.ts          # Task Zod schemas
  tui/
    RocketLoop.tsx       # Main loop TUI component
    RocketLoopApp.tsx    # Loop TUI orchestrator (state machine)
    components/          # Reusable TUI components
    hooks/
      useLoopRunner.ts   # Custom hook: consumes loop-runner AsyncGenerator
    themes/
      colors.ts          # Color definitions

templates/
  webapp/                # Web app template (React + Express)
    server/src/
      middleware/
        auth.ts          # Auth middleware (feature toggle)
      routes/
        auth.ts          # Auth routes (feature toggle)
        email.ts         # Email routes (feature toggle)
      lib/
        jwt.ts           # JWT utilities (feature toggle)
        mailer.ts        # Email sender (feature toggle)
        pdf.ts           # PDF generator (feature toggle)
  website/               # Website template (PHP + MySQL)
```
