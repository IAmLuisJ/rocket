import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export function ensureHistoryDir(projectRoot: string): void {
  const dir = join(projectRoot, '.agent', 'history')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function saveIterationHistory(
  projectRoot: string,
  sessionId: string,
  iteration: number,
  output: string,
): void {
  ensureHistoryDir(projectRoot)
  const filename = `ITERATION-${sessionId}-${iteration}.txt`
  const filepath = join(projectRoot, '.agent', 'history', filename)
  // Strip ANSI escape codes
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
  writeFileSync(filepath, clean, 'utf-8')
}
