import { readFileSync, writeFileSync } from 'fs'
import { existsSync } from 'fs'
import { join } from 'path'
import { TasksFileSchema, type Task, type TasksFile } from './schema.js'

export function getTasksPath(projectRoot: string): string {
  return join(projectRoot, '.agent', 'tasks.json')
}

export function readTasks(projectRoot: string): TasksFile {
  const tasksPath = getTasksPath(projectRoot)
  if (!existsSync(tasksPath)) {
    throw new Error(`No tasks.json found at ${tasksPath}. Run 'rocket init' first.`)
  }
  const raw = JSON.parse(readFileSync(tasksPath, 'utf-8')) as unknown
  return TasksFileSchema.parse(raw)
}

export function writeTasks(projectRoot: string, data: TasksFile): void {
  const tasksPath = getTasksPath(projectRoot)
  writeFileSync(tasksPath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getMaxTaskId(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  return Math.max(...tasks.map((t) => t.id))
}

export function getIncompleteTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.passes)
}
