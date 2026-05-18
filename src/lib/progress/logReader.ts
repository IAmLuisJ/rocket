import fs from 'fs-extra'
import { join } from 'path'
import type { Task } from '../tasks/schema.js'

export interface ActivityEntry {
  taskId: number | null
  taskTitle: string | null
  outcome: string
  backend: string
  timestamp: Date
}

export async function readRecentActivity(agentDir: string, limit = 5): Promise<ActivityEntry[]> {
  const logPath = join(agentDir, 'logs', 'LOG.md')
  if (!(await fs.pathExists(logPath))) return []

  const content = await fs.readFile(logPath, 'utf-8')
  return parseLogSections(content).slice(-limit)
}

export function parseLogSections(content: string): ActivityEntry[] {
  const sections = content.split(/^## Session /gm).slice(1)
  const entries: ActivityEntry[] = []

  for (const section of sections) {
    const lines = section.split('\n')
    const timestampText = lines[0]?.split(' · ')[0]?.trim()
    const taskInfo = extractField(section, 'Task')
    const backend = extractField(section, 'Backend') ?? 'unknown'
    const outcome = extractField(section, 'Outcome') ?? 'unknown'
    let taskId: number | null = null
    let taskTitle: string | null = null

    if (taskInfo && taskInfo !== 'Auto') {
      const taskMatch = taskInfo.match(/#(\d+)\s+(?:·\s*)?(.+)/)
      if (taskMatch) {
        taskId = parseInt(taskMatch[1], 10)
        taskTitle = taskMatch[2]
      }
    }

    entries.push({
      taskId,
      taskTitle,
      backend,
      outcome,
      timestamp: timestampText ? new Date(timestampText) : new Date(0),
    })
  }

  return entries
}

export async function getCurrentTask(agentDir: string, tasks: Task[]): Promise<Task | null> {
  const activity = await readRecentActivity(agentDir, 20)
  const inProgress = activity.filter((entry) => entry.outcome === 'in-progress')
  const lastActive = inProgress[inProgress.length - 1]
  if (!lastActive?.taskId) return null
  return tasks.find((task) => task.id === lastActive.taskId) ?? null
}

function extractField(section: string, name: string): string | null {
  const match = section.match(new RegExp(`- \\*\\*${name}\\*\\*:?\\s*(.+)`))
  return match?.[1]?.trim() ?? null
}
