import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface LogEntry {
  sessionId: string
  iteration: number
  taskId: number | null
  taskTitle: string | null
  outcome: string
  durationSec: number
  timestamp: string
}

export function readRecentActivity(projectRoot: string, limit = 10): LogEntry[] {
  const logPath = join(projectRoot, '.agent', 'logs', 'LOG.md')
  if (!existsSync(logPath)) return []

  const content = readFileSync(logPath, 'utf-8')
  const entries: LogEntry[] = []

  // Parse session entries from log
  const sessionRegex =
    /## Session (.+?) · Iteration (\d+)\n- \*\*Time:\*\* (.+?)\n- \*\*Task:\*\* (.+?)\n- \*\*Outcome:\*\* (.+?)\n- \*\*Duration:\*\* ([\d.]+)s/g

  let match
  while ((match = sessionRegex.exec(content)) !== null) {
    const taskInfo = match[4]
    let taskId: number | null = null
    let taskTitle: string | null = null

    if (taskInfo !== 'Auto') {
      const taskMatch = taskInfo.match(/#(\d+) · (.+)/)
      if (taskMatch) {
        taskId = parseInt(taskMatch[1], 10)
        taskTitle = taskMatch[2]
      }
    }

    entries.push({
      sessionId: match[1],
      iteration: parseInt(match[2], 10),
      taskId,
      taskTitle,
      outcome: match[5],
      durationSec: parseFloat(match[6]),
      timestamp: match[3],
    })
  }

  return entries.slice(-limit)
}

export function detectCurrentFocusTask(projectRoot: string): { id: number; title: string } | null {
  const entries = readRecentActivity(projectRoot, 1)
  if (entries.length === 0) return null
  const last = entries[entries.length - 1]
  if (last.taskId === null || last.taskTitle === null) return null
  return { id: last.taskId, title: last.taskTitle }
}
