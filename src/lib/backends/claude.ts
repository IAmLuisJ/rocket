import { spawn, type ChildProcess } from 'child_process'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

function extractTextFromClaudeJson(line: string): string | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>

    // result event — contains the final output text
    if (obj.type === 'result' && typeof obj.result === 'string') {
      return obj.result
    }

    // assistant event — contains the message with content array
    if (obj.type === 'assistant') {
      const msg = obj.message as Record<string, unknown> | undefined
      const content = msg?.content as Array<Record<string, unknown>> | undefined
      if (Array.isArray(content)) {
        const texts = content
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text as string)
        if (texts.length > 0) return texts.join('\n')
      }
    }

    return null
  } catch {
    return null
  }
}

export const claudeBackend: AgentBackend = {
  name: 'Claude CLI',

  spawn(options: BackendOptions): ChildProcess {
    return spawn(
      'claude',
      [
        '--model',
        'opus',
        '--output-format',
        'stream-json',
        '--verbose',
        '--dangerously-skip-permissions',
        '-p',
        options.prompt,
      ],
      {
        cwd: options.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
  },

  parseOutputLine(line: string): ParsedOutput | null {
    const text = extractTextFromClaudeJson(line)
    if (!text) return null
    return {
      text,
      isComplete: hasCompleteTag(text),
      isBlocked: hasBlockedTag(text),
      isDecide: hasDecideTag(text),
      blockedReason: hasBlockedTag(text) ? extractBlockedReason(text) : undefined,
      decideQuestion: hasDecideTag(text) ? extractDecideQuestion(text) : undefined,
    }
  },
}
