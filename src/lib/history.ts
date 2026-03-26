import fs from 'fs-extra'
import path from 'path'
import stripAnsi from 'strip-ansi'

export async function saveIteration(
  agentDir: string,
  sessionId: string,
  iteration: number,
  rawOutput: string,
): Promise<void> {
  const historyDir = path.join(agentDir, 'history')
  await fs.ensureDir(historyDir)
  const filename = `ITERATION-${sessionId}-${iteration}.txt`
  const clean = stripAnsi(rawOutput)
  await fs.writeFile(path.join(historyDir, filename), clean, 'utf-8')
}
