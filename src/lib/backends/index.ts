export { copilotBackend } from './copilot.js'
export { claudeBackend } from './claude.js'
export { dockerBackend } from './docker.js'
import { copilotBackend } from './copilot.js'
import { claudeBackend } from './claude.js'
import { dockerBackend } from './docker.js'
import type { AgentBackend } from './types.js'

export function selectBackend(opts: { claude?: boolean; docker?: boolean }): AgentBackend {
  if (opts.docker) return dockerBackend
  if (opts.claude) return claudeBackend
  return copilotBackend
}
