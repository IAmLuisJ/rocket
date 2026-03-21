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

  spawn(options: BackendOptions): ChildProcess {
    return spawn('copilot', ['--autopilot', '--prompt', options.prompt], {
      cwd: options.projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  },

  parseOutputLine(line: string): ParsedOutput | null {
    if (!line.trim()) return null
    return {
      text: line,
      isComplete: hasCompleteTag(line),
      isBlocked: hasBlockedTag(line),
      isDecide: hasDecideTag(line),
      blockedReason: hasBlockedTag(line) ? extractBlockedReason(line) : undefined,
      decideQuestion: hasDecideTag(line) ? extractDecideQuestion(line) : undefined,
    }
  },
}
