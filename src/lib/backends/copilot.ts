import { spawn, execSync, type ChildProcess } from 'child_process'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

function checkCopilotBinary(): void {
  try {
    execSync('which copilot', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'copilot CLI not found in PATH. Install it from https://github.com/github/gh-copilot',
    )
  }
}

export const copilotBackend: AgentBackend = {
  name: 'Copilot CLI',

  spawn(prompt: string, options: BackendOptions): ChildProcess {
    checkCopilotBinary()
    // SECURITY: prompt passed as separate arg to prevent shell injection. Do not switch to exec() or shell:true.
    return spawn('copilot', ['--autopilot', '--prompt', prompt], {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  },

  parseOutput(line: string): ParsedOutput | null {
    if (!line.trim()) return null
    if (hasCompleteTag(line)) return { type: 'complete' }
    if (hasBlockedTag(line)) return { type: 'blocked', reason: extractBlockedReason(line) }
    if (hasDecideTag(line)) return { type: 'decide', question: extractDecideQuestion(line) }
    return { type: 'text', content: line }
  },
}
