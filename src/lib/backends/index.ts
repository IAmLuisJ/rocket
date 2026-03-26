export { copilotBackend } from './copilot.js'
export { claudeBackend } from './claude.js'
export { dockerBackend } from './docker.js'
export type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'
import { copilotBackend } from './copilot.js'
import { claudeBackend } from './claude.js'
import { dockerBackend } from './docker.js'
import type { AgentBackend } from './types.js'

export function getBackend(options: { claude?: boolean; docker?: boolean }): AgentBackend {
  if (options.claude && options.docker) {
    throw new Error('Cannot use --claude and --docker simultaneously. Choose one.')
  }
  if (options.docker) return dockerBackend
  if (options.claude) return claudeBackend
  return copilotBackend
}
