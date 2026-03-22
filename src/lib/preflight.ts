export function checkNodeVersion(): void {
  const [major] = process.version.slice(1).split('.').map(Number)
  if (major < 22) {
    console.error(
      `\x1b[31mError:\x1b[0m Rocket requires Node.js >=22. You are running ${process.version}.\nPlease upgrade: https://nodejs.org`,
    )
    process.exit(1)
  }
}

import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

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
