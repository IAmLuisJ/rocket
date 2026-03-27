import { spawn, execSync, type ChildProcess } from 'child_process'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

function checkClaudeBinary(): void {
  try {
    execSync('which claude', { stdio: 'ignore' })
  } catch {
    throw new Error(
      'claude CLI not found in PATH. Install Claude Code from https://claude.ai/download',
    )
  }
}

export const claudeBackend: AgentBackend = {
  name: 'Claude (direct)',

  spawn(prompt: string, options: BackendOptions): ChildProcess {
    checkClaudeBinary()
    // SECURITY: prompt passed as separate arg to prevent shell injection. Do not switch to exec() or shell:true.
    return spawn('claude', ['--model', 'opus', '-p', prompt], {
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
