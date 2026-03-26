import { spawn, type ChildProcess } from 'child_process'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

export const copilotBackend: AgentBackend = {
  name: 'Copilot CLI',

  spawn(prompt: string, options: BackendOptions): ChildProcess {
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
