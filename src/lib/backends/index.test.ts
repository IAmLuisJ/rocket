import { describe, it, expect } from 'vitest'
import { getBackend } from './index.js'
import { copilotBackend } from './copilot.js'
import { claudeBackend } from './claude.js'
import { dockerBackend } from './docker.js'

describe('getBackend', () => {
  it('returns copilot backend by default', () => {
    expect(getBackend({})).toBe(copilotBackend)
  })

  it('returns claude backend when claude flag is set', () => {
    expect(getBackend({ claude: true })).toBe(claudeBackend)
  })

  it('returns docker backend when docker flag is set', () => {
    expect(getBackend({ docker: true })).toBe(dockerBackend)
  })

  it('throws when both claude and docker flags are set', () => {
    expect(() => getBackend({ claude: true, docker: true })).toThrow(
      'Cannot use --claude and --docker simultaneously. Choose one.',
    )
  })

  it('returns copilot when both flags are false', () => {
    expect(getBackend({ claude: false, docker: false })).toBe(copilotBackend)
  })
})
