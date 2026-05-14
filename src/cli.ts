import { Command } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string
}

export const program = new Command()

program
  .name('rocket')
  .description('AI-powered project scaffolding and development loop')
  .version(pkg.version)

// Lazy-load commands
program
  .command('new [project-name]')
  .description('Scaffold a new project from a template')
  .option('-t, --type <type>', 'Project type: webapp or website')
  .action(async (projectName: string | undefined, opts: { type?: string }) => {
    const { runNew } = await import('./commands/new.js')
    await runNew(projectName, opts)
  })

program
  .command('loop')
  .description('Run the Rocket AI development loop')
  .option('--claude', 'Use Claude CLI directly (no Docker)')
  .option('--docker', 'Use Claude in Docker sandbox')
  .option('-n, --max-iterations <n>', 'Maximum iterations', '10')
  .option('--once', 'Run a single iteration and exit')
  .option('--select', 'Choose a task before starting')
  .option('--no-caffeinate', 'Disable macOS sleep prevention')
  .action(
    async (opts: {
      claude?: boolean
      docker?: boolean
      maxIterations?: string
      once?: boolean
      select?: boolean
      caffeinate?: boolean
    }) => {
      const { runLoop } = await import('./commands/loop.js')
      await runLoop(opts)
    },
  )

program
  .command('feature [description]')
  .description('Add a feature: AI generates spec and tasks, updates PRD')
  .option('--no-questions', 'Skip clarification questions')
  .option('--dry-run', 'Preview changes without writing files')
  .option('--backend <name>', 'AI backend: copilot | claude | docker')
  .action(
    async (
      description: string | undefined,
      opts: { questions?: boolean; dryRun?: boolean; backend?: string },
    ) => {
      const { runFeature } = await import('./commands/feature.js')
      await runFeature(description, opts)
    },
  )

program
  .command('status')
  .description('Show project progress dashboard')
  .option('--watch', 'Auto-refresh every 5 seconds')
  .option('--json', 'Output JSON instead of TUI')
  .option('--incomplete', 'List all incomplete tasks')
  .option('--category <name>', 'Filter by task category')
  .action(
    async (opts: { watch?: boolean; json?: boolean; incomplete?: boolean; category?: string }) => {
      const { runStatus } = await import('./commands/status.js')
      await runStatus(opts)
    },
  )

program
  .command('tasks')
  .description('View and manage tasks')
  .option('--filter <status>', 'Filter: incomplete | complete | blocked')
  .action(async (opts: { filter?: string }) => {
    const { runTasks } = await import('./commands/tasks.js')
    await runTasks(opts)
  })

program
  .command('prd [description]')
  .description('Initialize PRD and tasks using AI from a project description')
  .option('--claude', 'Use Claude CLI directly (no Docker)')
  .option('--docker', 'Use Claude in Docker sandbox')
  .action(async (description: string | undefined, opts: { claude?: boolean; docker?: boolean }) => {
    const { runPrd } = await import('./commands/prd.js')
    await runPrd(description, opts)
  })

program
  .command('init')
  .description('Initialize .agent/ structure in an existing project')
  .action(async () => {
    const { runInit } = await import('./commands/init.js')
    await runInit()
  })
