import React from 'react'
import { render } from 'ink'
import { readTasks } from '../lib/tasks/reader.js'
import { writeTasks } from '../lib/tasks/reader.js'
import { TasksApp } from '../tui/components/TasksApp.js'

export async function runTasks(opts: { filter?: string }): Promise<void> {
  const projectRoot = process.cwd()
  const tasksData = await readTasks(projectRoot)

  const { waitUntilExit } = render(
    React.createElement(TasksApp, {
      tasks: tasksData.tasks,
      initialFilter: opts.filter,
      onMarkComplete: async (taskId: number) => {
        const task = tasksData.tasks.find((t) => t.id === taskId)
        if (task) {
          task.passes = true
          await writeTasks(projectRoot, tasksData)
        }
      },
    }),
  )
  await waitUntilExit()
}
