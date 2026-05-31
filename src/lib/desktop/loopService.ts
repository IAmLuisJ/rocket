import { join } from 'path'
import type { AgentBackend } from '../backends/types.js'
import { runLoop, type LoopEvent } from '../loop-runner.js'
import { readTasks } from '../tasks/reader.js'
import { readProjectDashboard, type ProjectDashboard } from './projectService.js'

export type DesktopLoopEvent =
  | { type: 'started'; taskId: number | null; backendName: string }
  | LoopEvent
  | { type: 'finished'; dashboard: ProjectDashboard }

export interface RunDesktopLoopOptions {
  projectRoot: string
  backend: AgentBackend
  maxIterations: number
  taskId?: number | null
  caffeinate?: boolean
  emit: (event: DesktopLoopEvent) => void
  onChild?: Parameters<typeof runLoop>[0]['onChild']
}

export async function runDesktopLoop(options: RunDesktopLoopOptions): Promise<ProjectDashboard> {
  const tasks = readTasks(options.projectRoot).tasks
  const task = options.taskId
    ? (tasks.find((candidate) => candidate.id === options.taskId) ?? null)
    : null
  const agentDir = join(options.projectRoot, '.agent')

  options.emit({
    type: 'started',
    taskId: task?.id ?? null,
    backendName: options.backend.name,
  })

  for await (const event of runLoop({
    task,
    backend: options.backend,
    maxIterations: options.maxIterations,
    projectRoot: options.projectRoot,
    agentDir,
    caffeinate: options.caffeinate,
    onChild: options.onChild,
  })) {
    options.emit(event)
  }

  const dashboard = await readProjectDashboard(options.projectRoot)
  options.emit({ type: 'finished', dashboard })
  return dashboard
}
