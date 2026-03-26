import { existsSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import { render } from 'ink'
import React from 'react'
import { checkAgentStructure, checkBackendAvailability } from '../lib/preflight.js'
import { readTasks, getIncompleteTasks } from '../lib/tasks/reader.js'
import { getBackend } from '../lib/backends/index.js'
import { start as startCaffeinate, stop as stopCaffeinate } from '../lib/caffeinate.js'
import { ensureLogFile } from '../lib/log.js'
import { getDefaultPromptContent } from '../lib/prompt.js'
import { RocketLoop } from '../tui/RocketLoop.js'

export async function runLoop(opts: {
  claude?: boolean
  docker?: boolean
  maxIterations?: string
  once?: boolean
  auto?: boolean
  caffeinate?: boolean
}): Promise<void> {
  const projectRoot = process.cwd()
  const maxIterations = opts.once ? 1 : parseInt(opts.maxIterations ?? '10', 10)

  if (!opts.once && (isNaN(maxIterations) || maxIterations < 1)) {
    console.error('Error: --max-iterations must be a positive integer')
    process.exit(1)
  }

  // Check for .agent/ directory
  const agentDir = join(projectRoot, '.agent')
  if (!existsSync(agentDir)) {
    console.error('\n  ❌ No .agent/ directory found. Run rocket init first.\n')
    process.exit(1)
  }

  // Create default PROMPT.md if missing (before preflight so it passes)
  const promptPath = join(projectRoot, '.agent', 'PROMPT.md')
  if (!existsSync(promptPath)) {
    writeFileSync(promptPath, getDefaultPromptContent(), 'utf-8')
  }

  // Preflight checks
  const preflight = checkAgentStructure(projectRoot)
  if (!preflight.ok) {
    console.error('\n  ❌ Rocket Loop cannot start:\n')
    preflight.errors.forEach((e) => console.error(`  • ${e}`))
    console.error()
    process.exit(1)
  }

  const backends = checkBackendAvailability()
  const backend = getBackend(opts)

  if (opts.docker && !backends.docker) {
    console.error('  ❌ Docker not found in PATH. Please install Docker Desktop.')
    process.exit(1)
  }
  if (opts.claude && !backends.claude) {
    console.error(
      '  ❌ claude CLI not found in PATH. Install with: npm install -g @anthropic-ai/claude-code',
    )
    process.exit(1)
  }
  if (!opts.docker && !opts.claude && !backends.copilot) {
    console.error('  ❌ copilot CLI not found in PATH.')
    console.error('  Install: npm install -g @github/copilot')
    console.error('  Or use --claude or --docker to use a different backend.')
    process.exit(1)
  }

  // Load tasks
  const tasksFile = readTasks(projectRoot)
  const incomplete = getIncompleteTasks(tasksFile.tasks)

  if (incomplete.length === 0) {
    console.log('\n  🎉 All tasks are already complete!\n')
    tasksFile.tasks.forEach((t) => {
      console.log(`  ✅ #${t.id} ${t.title}`)
    })
    console.log()
    process.exit(0)
  }

  // Start caffeinate on macOS (unless --no-caffeinate)
  const caffeinateProc = opts.caffeinate !== false ? startCaffeinate() : null

  // Ensure log file exists
  ensureLogFile(projectRoot)

  const projectName = basename(projectRoot)

  // Start the Ink TUI
  const { waitUntilExit } = render(
    React.createElement(RocketLoop, {
      projectRoot,
      projectName,
      backend,
      tasks: tasksFile.tasks,
      maxIterations,
      auto: opts.auto,
    }),
  )

  try {
    await waitUntilExit()
  } finally {
    stopCaffeinate(caffeinateProc)
  }
}
