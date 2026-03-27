import React from 'react'
import { render } from 'ink'
import { existsSync } from 'fs'
import { join } from 'path'
import { readTasks } from '../lib/tasks/reader.js'
import { writeTasks } from '../lib/tasks/reader.js'
import { TasksApp } from '../tui/components/TasksApp.js'

export async function runTasks(opts: { filter?: string }): Promise<void> {
  const projectRoot = process.cwd()
  const tasksPath = join(projectRoot, '.agent', 'tasks.json')

  if (!existsSync(tasksPath)) {
    console.error("No .agent/tasks.json found. Run 'rocket init' first.")
    process.exit(1)
  }

  const tasksData = readTasks(projectRoot)

  if (tasksData.tasks.length === 0) {
    console.log('No tasks found in tasks.json')
    return
  }

  const { waitUntilExit } = render(
    React.createElement(TasksApp, {
      tasks: tasksData.tasks,
      initialFilter: opts.filter,
      onMarkComplete: async (taskId: number) => {
        const task = tasksData.tasks.find((t) => t.id === taskId)
        if (task) {
          task.passes = true
          writeTasks(projectRoot, tasksData)
        }
      },
    }),
  )
  await waitUntilExit()
}
