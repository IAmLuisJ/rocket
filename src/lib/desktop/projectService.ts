import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { basename, join } from 'path'
import { TaskSchema, type Task, type TaskCategory } from '../tasks/schema.js'
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

export interface TaskDetailsInput {
  title: string
  description: string
  category: TaskCategory
  passCondition: string
}

export interface ProjectContext {
  hasAgent: boolean
  prdMarkdown: string
  summaryMarkdown: string
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

export async function readProjectContext(projectRoot: string): Promise<ProjectContext> {
  const prdDir = join(projectRoot, '.agent', 'prd')
  const prdPath = join(prdDir, 'PRD.md')
  const summaryPath = join(prdDir, 'SUMMARY.md')

  if (!existsSync(prdPath) && !existsSync(summaryPath)) {
    return { hasAgent: false, prdMarkdown: '', summaryMarkdown: '' }
  }

  const [prdMarkdown, summaryMarkdown] = await Promise.all([
    readOptionalTextFile(prdPath),
    readOptionalTextFile(summaryPath),
  ])

  return {
    hasAgent: true,
    prdMarkdown,
    summaryMarkdown,
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

export async function setTaskDetails(
  projectRoot: string,
  taskId: number,
  details: TaskDetailsInput,
): Promise<ProjectDashboard> {
  const tasksFile = readTasks(projectRoot)
  let found = false
  const tasks = tasksFile.tasks.map((task) => {
    if (task.id !== taskId) return task
    found = true
    return TaskSchema.parse({
      ...task,
      title: details.title,
      description: details.description,
      category: details.category,
      passCondition: details.passCondition,
    })
  })

  if (!found) {
    throw new Error(`Task #${taskId} was not found.`)
  }

  writeTasks(projectRoot, { tasks })
  return readProjectDashboard(projectRoot)
}

async function readOptionalTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}
