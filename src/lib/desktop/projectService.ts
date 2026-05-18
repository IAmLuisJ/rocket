import { existsSync } from 'fs'
import { basename, join } from 'path'
import type { Task } from '../tasks/schema.js'
import { calculateProgress, type ProgressStats } from '../progress/calculator.js'
import { readHistoryStats, type HistoryStats } from '../progress/historyReader.js'
import { getCurrentTask, readRecentActivity, type ActivityEntry } from '../progress/logReader.js'
import { readTasks, writeTasks } from '../tasks/reader.js'

export interface ProjectDashboard {
  projectRoot: string
  projectName: string
  hasAgent: boolean
  tasks: Task[]
  progress: ProgressStats
  activity: ActivityEntry[]
  history: HistoryStats
  currentTask: Task | null
}

export async function readProjectDashboard(projectRoot: string): Promise<ProjectDashboard> {
  const agentDir = join(projectRoot, '.agent')
  const tasksPath = join(agentDir, 'tasks.json')

  if (!existsSync(tasksPath)) {
    return {
      projectRoot,
      projectName: basename(projectRoot),
      hasAgent: false,
      tasks: [],
      progress: calculateProgress([]),
      activity: [],
      history: { sessionCount: 0, totalRuntimeSeconds: 0 },
      currentTask: null,
    }
  }

  const tasks = readTasks(projectRoot).tasks
  const [activity, history, currentTask] = await Promise.all([
    readRecentActivity(agentDir, 8),
    readHistoryStats(agentDir),
    getCurrentTask(agentDir, tasks),
  ])

  return {
    projectRoot,
    projectName: basename(projectRoot),
    hasAgent: true,
    tasks,
    progress: calculateProgress(tasks),
    activity,
    history,
    currentTask,
  }
}

export async function setTaskPasses(
  projectRoot: string,
  taskId: number,
  passes: boolean,
): Promise<ProjectDashboard> {
  const tasksFile = readTasks(projectRoot)
  writeTasks(projectRoot, {
    tasks: tasksFile.tasks.map((task) => (task.id === taskId ? { ...task, passes } : task)),
  })
  return readProjectDashboard(projectRoot)
}
