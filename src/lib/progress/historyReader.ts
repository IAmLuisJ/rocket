import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { readRecentActivity } from './logReader.js'

export interface SessionSummary {
  sessionCount: number
  totalRuntimeSec: number
}

export function getSessionSummary(projectRoot: string): SessionSummary {
  const historyDir = join(projectRoot, '.agent', 'history')
  let sessionCount = 0

  if (existsSync(historyDir)) {
    const files = readdirSync(historyDir)
    // Session files follow the pattern: session-<id>-iter-<n>.txt
    const sessionIds = new Set(
      files
        .filter((f) => f.endsWith('.txt'))
        .map((f) => {
          const match = f.match(/^(.+)-iter-\d+\.txt$/)
          return match ? match[1] : null
        })
        .filter(Boolean),
    )
    sessionCount = sessionIds.size
  }

  // Sum up durations from log entries
  const entries = readRecentActivity(projectRoot, 1000)
  const totalRuntimeSec = entries.reduce((sum, e) => sum + e.durationSec, 0)

  return { sessionCount, totalRuntimeSec }
}
