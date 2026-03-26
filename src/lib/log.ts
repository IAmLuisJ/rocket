import fs from 'fs-extra'
import path from 'path'

export type SessionLog = {
  taskId: number | null
  taskTitle: string | null
  backend: string
  iterations: number
  outcome: 'complete' | 'blocked' | 'decide' | 'max-iterations' | 'iteration' | 'error'
  elapsedMs: number
  timestamp: Date
}

export async function appendSessionLog(agentDir: string, log: SessionLog): Promise<void> {
  const logPath = path.join(agentDir, 'logs', 'LOG.md')
  await fs.ensureDir(path.dirname(logPath))
  const section = formatLogSection(log)
  await fs.appendFile(logPath, section + '\n', 'utf-8')
}

function formatLogSection(log: SessionLog): string {
  const elapsed = `${Math.floor(log.elapsedMs / 60000)}m ${Math.floor((log.elapsedMs % 60000) / 1000)}s`
  const taskInfo = log.taskId ? `#${log.taskId} ${log.taskTitle}` : 'Auto'
  return [
    `## Session ${log.timestamp.toISOString()}`,
    `- **Task**: ${taskInfo}`,
    `- **Backend**: ${log.backend}`,
    `- **Iterations**: ${log.iterations}`,
    `- **Outcome**: ${log.outcome}`,
    `- **Elapsed**: ${elapsed}`,
  ].join('\n')
}

export function ensureLogFile(projectRoot: string): void {
  const logPath = path.join(projectRoot, '.agent', 'logs', 'LOG.md')
  const logDir = path.dirname(logPath)
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(
      logPath,
      `# Rocket Loop Log\n\nStarted: ${new Date().toISOString()}\n\n---\n`,
      'utf-8',
    )
  }
}
