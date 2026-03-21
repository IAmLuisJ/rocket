import { spawn, type ChildProcess } from 'child_process'
import { platform } from 'os'
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

    if (obj.type === 'result' && typeof obj.result === 'string') {
      return obj.result
    }

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

const DOCKER_CMD =
  'docker sandbox run claude . -- --model opus --output-format stream-json --verbose -p "$ROCKET_PROMPT"'

export const dockerBackend: AgentBackend = {
  name: 'Docker Sandbox',

  spawn(options: BackendOptions): ChildProcess {
    const env = {
      ...process.env,
      ROCKET_PROMPT: options.prompt,
      DOCKER_DEFAULT_PLATFORM: 'linux/amd64',
    }

    if (platform() === 'darwin') {
      // On macOS, use `script -q /dev/null` to provide a pseudo-TTY
      return spawn('script', ['-q', '/dev/null', 'bash', '-c', DOCKER_CMD], {
        cwd: options.projectRoot,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    }

    // On Linux, spawn bash directly
    return spawn('bash', ['-c', DOCKER_CMD], {
      cwd: options.projectRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  },

  parseOutputLine(line: string): ParsedOutput | null {
    // Detect Docker-specific error strings (plain text, not JSON)
    if (line.includes('docker daemon not ready')) {
      return {
        text: line,
        isComplete: false,
        isBlocked: true,
        isDecide: false,
        blockedReason: 'Docker daemon is not ready. Please ensure Docker Desktop is running.',
      }
    }

    if (line.includes('Invalid API key')) {
      return {
        text: line,
        isComplete: false,
        isBlocked: true,
        isDecide: false,
        blockedReason:
          'Invalid API key. Run `docker sandbox run claude . --` to authenticate inside the sandbox.',
      }
    }

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
