import fs from 'fs-extra'
import { join } from 'path'

export interface HistoryStats {
  sessionCount: number
  totalRuntimeSeconds: number
}

export async function readHistoryStats(agentDir: string): Promise<HistoryStats> {
  const historyDir = join(agentDir, 'history')
  if (!(await fs.pathExists(historyDir))) {
    return { sessionCount: 0, totalRuntimeSeconds: 0 }
  }

  const sessions = new Map<number, number[]>()
  for (const file of await fs.readdir(historyDir)) {
    const match = file.match(/^ITERATION-(\d+)-(\d+)\.txt$/)
    if (!match) continue
    const sessionId = Number(match[1])
    const iteration = Number(match[2])
    const existing = sessions.get(sessionId) ?? []
    existing.push(iteration)
    sessions.set(sessionId, existing)
  }

  let totalRuntimeSeconds = 0
  for (const iterations of sessions.values()) {
    const lastIteration = Math.max(...iterations)
    totalRuntimeSeconds += Math.max(0, lastIteration - 1)
  }

  return { sessionCount: sessions.size, totalRuntimeSeconds }
}

export async function getSessionSummary(agentDir: string): Promise<HistoryStats> {
  return readHistoryStats(agentDir)
}
