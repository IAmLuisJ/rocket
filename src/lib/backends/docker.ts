import { spawn, execSync, type ChildProcess } from 'child_process'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

function checkDockerBinary(): void {
  try {
    execSync('which docker', { stdio: 'ignore' })
  } catch {
    throw new Error('docker not found in PATH. Install Docker from https://docker.com')
  }
}

export const dockerBackend: AgentBackend = {
  name: 'Claude (Docker sandbox)',

  spawn(prompt: string, options: BackendOptions): ChildProcess {
    checkDockerBinary()
    return spawn(
      'docker',
      ['sandbox', 'run', 'claude', '.', '--', '--model', 'opus', '-p', prompt],
      {
        cwd: options.cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
  },

  parseOutput(line: string): ParsedOutput | null {
    if (!line.trim()) return null
    if (hasCompleteTag(line)) return { type: 'complete' }
    if (hasBlockedTag(line)) return { type: 'blocked', reason: extractBlockedReason(line) }
    if (hasDecideTag(line)) return { type: 'decide', question: extractDecideQuestion(line) }
    return { type: 'text', content: line }
  },
}
