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
    preflight.ts         # Pre-loop validation checks
    prompt.ts            # Prompt builder for AI backends
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
    components/          # Reusable TUI components
    themes/
      colors.ts          # Color definitions

templates/
  webapp/                # Web app template (React + Express)
  website/               # Website template (PHP + MySQL)
```
