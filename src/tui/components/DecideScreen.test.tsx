import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { DecideScreen } from './DecideScreen.js'

vi.mock('fs-extra', () => ({
  default: {
    appendFile: vi.fn().mockResolvedValue(undefined),
  },
}))

import fs from 'fs-extra'

describe('DecideScreen', () => {
  const defaultProps = {
    question: 'Should we use Redis or Memcached?',
    agentDir: '/tmp/project/.agent',
    onDecide: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders yellow Decision Needed header', () => {
    const { lastFrame } = render(<DecideScreen {...defaultProps} />)
    const output = lastFrame()!
    expect(output).toContain('Decision Needed')
  })

  it('displays the decision question', () => {
    const { lastFrame } = render(<DecideScreen {...defaultProps} />)
    const output = lastFrame()!
    expect(output).toContain('Should we use Redis or Memcached?')
  })

  it('renders the thinking emoji', () => {
    const { lastFrame } = render(<DecideScreen {...defaultProps} />)
    const output = lastFrame()!
    expect(output).toContain('🤔')
  })

  it('shows answer input prompt', () => {
    const { lastFrame } = render(<DecideScreen {...defaultProps} />)
    const output = lastFrame()!
    expect(output).toContain('Your answer:')
  })

  it('calls onDecide and writes to decisions.md on submit', async () => {
    const onDecide = vi.fn()
    const { stdin } = render(
      <DecideScreen question="Pick a DB?" agentDir="/tmp/.agent" onDecide={onDecide} />,
    )

    // Press enter to submit (empty answer since stdin doesn't drive TextInput onChange in tests)
    await new Promise((r) => setTimeout(r, 50))
    stdin.write('\r')
    await new Promise((r) => setTimeout(r, 50))

    expect(fs.appendFile).toHaveBeenCalledWith(
      '/tmp/.agent/decisions.md',
      expect.stringContaining('## Pick a DB?'),
      'utf-8',
    )
    expect(onDecide).toHaveBeenCalled()
  })
})
