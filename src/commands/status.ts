import { existsSync } from 'fs'
import { join } from 'path'
import React from 'react'
import { render } from 'ink'
import { readTasks } from '../lib/tasks/reader.js'
import { calculateProgress } from '../lib/progress/calculator.js'
import { StatusApp } from '../tui/components/StatusApp.js'

export async function runStatus(opts: {
  watch?: boolean
  json?: boolean
  incomplete?: boolean
  category?: string
}): Promise<void> {
  const projectRoot = process.cwd()

  // Gracefully handle missing .agent/ files
  const tasksPath = join(projectRoot, '.agent', 'tasks.json')
  if (!existsSync(tasksPath)) {
    console.error('\n  ❌ No .agent/tasks.json found. Run rocket init first.\n')
    process.exit(1)
  }

  const tasksFile = readTasks(projectRoot)
  const progress = calculateProgress(tasksFile.tasks)

  if (opts.json) {
    console.log(JSON.stringify(progress, null, 2))
    return
  }

  if (opts.incomplete) {
    const incomplete = tasksFile.tasks.filter((t) => !t.passes)
    for (const t of incomplete) {
      if (opts.category && t.category !== opts.category) continue
      console.log(`  [#${t.id}] ${t.title} (${t.category})`)
    }
    if (incomplete.length === 0) {
      console.log('  All tasks complete!')
    }
    return
  }

  const { waitUntilExit } = render(
    React.createElement(StatusApp, {
      tasks: tasksFile.tasks,
      progress,
      watch: opts.watch,
      categoryFilter: opts.category,
    }),
  )
  await waitUntilExit()
}
