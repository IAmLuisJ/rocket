import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'

export function ensureLogFile(projectRoot: string): void {
  const logPath = join(projectRoot, '.agent', 'logs', 'LOG.md')
  const logDir = dirname(logPath)
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      `# Rocket Loop Log\n\nStarted: ${new Date().toISOString()}\n\n---\n`,
      'utf-8',
    )
  }
}

export function appendLogEntry(
  projectRoot: string,
  sessionId: string,
  iteration: number,
  taskId: number | null,
  taskTitle: string | null,
  outcome: 'complete' | 'blocked' | 'decide' | 'max-iterations' | 'iteration',
  summary: string,
  durationMs: number,
): void {
  const logPath = join(projectRoot, '.agent', 'logs', 'LOG.md')
  const ts = new Date().toISOString()
  const taskInfo = taskId ? `#${taskId} · ${taskTitle}` : 'Auto'
  const entry = `\n## Session ${sessionId} · Iteration ${iteration}\n- **Time:** ${ts}\n- **Task:** ${taskInfo}\n- **Outcome:** ${outcome}\n- **Duration:** ${(durationMs / 1000).toFixed(1)}s\n- **Summary:** ${summary.slice(0, 300)}\n`
  appendFileSync(logPath, entry, 'utf-8')
}
