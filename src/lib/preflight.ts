import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { pathExists } from 'fs-extra'
import { z } from 'zod'
import { readTasks, getIncompleteTasks } from './tasks/reader.js'
import type { AgentBackend } from './backends/types.js'

export function checkNodeVersion(): void {
  const [major] = process.version.slice(1).split('.').map(Number)
  if (major < 22) {
    console.error(
      `\x1b[31mError:\x1b[0m Rocket requires Node.js >=22. You are running ${process.version}.\nPlease upgrade: https://nodejs.org`,
    )
    process.exit(1)
  }
}

export interface PreflightResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function checkAgentStructure(projectRoot: string): PreflightResult {
  const errors: string[] = []
  const warnings: string[] = []

  const required = ['.agent/tasks.json', '.agent/prd/PRD.md', '.agent/PROMPT.md']

  for (const rel of required) {
    if (!existsSync(join(projectRoot, rel))) {
      errors.push(`Missing ${rel} — run 'rocket init' to create it`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

export function checkBinaryInPath(binary: string): boolean {
  try {
    execSync(`which ${binary}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** @deprecated Use checkBinaryInPath */
export const checkCommand = checkBinaryInPath

export function checkBackendAvailability(): {
  copilot: boolean
  claude: boolean
  docker: boolean
} {
  return {
    copilot: checkBinaryInPath('copilot'),
    claude: checkBinaryInPath('claude'),
    docker: checkBinaryInPath('docker'),
  }
}

const backendBinaryMap: Record<string, { binary: string; installUrl: string }> = {
  'Copilot CLI': {
    binary: 'copilot',
    installUrl: 'https://github.com/github/gh-copilot',
  },
  'Claude (direct)': {
    binary: 'claude',
    installUrl: 'https://claude.ai/download',
  },
  'Claude (Docker sandbox)': {
    binary: 'docker',
    installUrl: 'https://docker.com',
  },
}

export async function runPreflight(agentDir: string, backend: AgentBackend): Promise<void> {
  const tasksFile = join(agentDir, 'tasks.json')
  if (!(await pathExists(tasksFile))) {
    throw new Error("No tasks.json found. Run 'rocket init' to set up the .agent/ directory.")
  }

  const projectRoot = dirname(agentDir)
  let tasks
  try {
    tasks = readTasks(projectRoot)
  } catch (e) {
    if (e instanceof z.ZodError) {
      const lines = e.errors.map(
        (err) => `  Path: ${err.path.join('.')}, Error: ${err.message}`,
      )
      throw new Error(`Invalid tasks.json:\n${lines.join('\n')}`)
    }
    throw e
  }
  if (getIncompleteTasks(tasks.tasks).length === 0) {
    throw new Error('All tasks are complete! Nothing to loop on.')
  }

  const info = backendBinaryMap[backend.name]
  if (info && !checkBinaryInPath(info.binary)) {
    throw new Error(`${info.binary} not found in PATH. Install it from ${info.installUrl}`)
  }
}
