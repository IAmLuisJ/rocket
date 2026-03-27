import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { BlockedScreen } from './BlockedScreen.js'

// Mock useApp to capture exit calls, but keep useInput real so ink-testing-library stdin works
const mockExit = vi.fn()
vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink')
  return {
    ...actual,
    useApp: () => ({ exit: mockExit }),
  }
})

describe('BlockedScreen', () => {
  it('renders red header text', () => {
    const { lastFrame } = render(<BlockedScreen reason="Missing API key" />)
    const output = lastFrame()!
    expect(output).toContain('Loop Blocked')
  })

  it('displays the blocked reason', () => {
    const { lastFrame } = render(<BlockedScreen reason="Docker daemon not running" />)
    const output = lastFrame()!
    expect(output).toContain('Docker daemon not running')
  })

  it('shows fix instructions', () => {
    const { lastFrame } = render(<BlockedScreen reason="error" />)
    const output = lastFrame()!
    expect(output).toContain('Fix the issue and run rocket loop again')
    expect(output).toContain('Press any key to exit')
  })

  it('calls exit on keypress', async () => {
    mockExit.mockClear()
    const { stdin } = render(<BlockedScreen reason="blocked" />)
    await new Promise((r) => setTimeout(r, 50))
    stdin.write('x')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockExit).toHaveBeenCalled()
  })

  it('renders the stop emoji', () => {
    const { lastFrame } = render(<BlockedScreen reason="test" />)
    const output = lastFrame()!
    expect(output).toContain('⛔')
  })
})
