import { existsSync } from 'fs'
import { basename, join } from 'path'
import React from 'react'
import { render } from 'ink'
import { readTasks, getIncompleteTasks } from '../lib/tasks/reader.js'
import { calculateProgress } from '../lib/progress/calculator.js'
import { readRecentActivity, getCurrentTask } from '../lib/progress/logReader.js'
import { readHistoryStats } from '../lib/progress/historyReader.js'
import { StatusApp } from '../tui/components/StatusApp.js'

export async function runStatus(opts: {
  watch?: boolean
  json?: boolean
  incomplete?: boolean
  category?: string
}): Promise<void> {
  try {
    const projectRoot = process.cwd()
    const agentDir = join(projectRoot, '.agent')

    const tasksPath = join(agentDir, 'tasks.json')
    if (!existsSync(tasksPath)) {
      console.log('No tasks found — run `rocket init` to set up your project.')
      return
    }

    const tasksFile = readTasks(projectRoot)
    const categories = [...new Set(tasksFile.tasks.map((task) => task.category))].sort()
    if (opts.category && !categories.some((category) => category === opts.category)) {
      console.error(`Unknown category: ${opts.category}. Valid: ${categories.join(', ')}`)
      process.exit(1)
    }

    const filteredTasks = opts.category
      ? tasksFile.tasks.filter((task) => task.category === opts.category)
      : tasksFile.tasks
    const progress = calculateProgress(filteredTasks)
    const history = await readHistoryStats(agentDir)
    const activity = await readRecentActivity(agentDir, 5)
    const currentTask = await getCurrentTask(agentDir, tasksFile.tasks)

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            overall: progress.overall,
            currentTask,
            byCategory: progress.byCategory,
            loopSessions: history.sessionCount,
            totalRuntimeSeconds: history.totalRuntimeSeconds,
          },
          null,
          2,
        ),
      )
      return
    }

    if (opts.incomplete) {
      const incomplete = getIncompleteTasks(filteredTasks)
      for (const task of incomplete) {
        console.log(`#${task.id} · ${task.title} [${task.category}]`)
      }
      if (incomplete.length === 0) {
        console.log('All tasks complete!')
      }
      return
    }

    const { waitUntilExit } = render(
      React.createElement(StatusApp, {
        tasks: filteredTasks,
        progress,
        watch: opts.watch,
        categoryFilter: opts.category,
        projectName: basename(projectRoot),
        activity,
        history,
        currentTask,
      }),
    )
    await waitUntilExit()
  } catch (err) {
    if (err instanceof Error && err.message === 'exit') throw err
    console.error('Status error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
