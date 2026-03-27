import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { CompletionReport } from './CompletionReport.js'

const baseProps = {
  outcome: 'complete' as const,
  task: {
    id: 42,
    title: 'Build widget',
    passes: false,
    description: 'Build the widget component',
    category: 'ui-ux' as const,
    passCondition: 'Widget renders correctly',
  },
  iterations: 3,
  totalMs: 125000,
  iterationStats: [
    { iteration: 1, durationMs: 40000 },
    { iteration: 2, durationMs: 45000 },
    { iteration: 3, durationMs: 40000 },
  ],
  summary: 'Built the widget successfully',
}

describe('CompletionReport', () => {
  it('renders green Task complete header for complete outcome', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} />)
    const output = lastFrame()!
    expect(output).toContain('Task complete!')
  })

  it('displays task title and id', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} />)
    const output = lastFrame()!
    expect(output).toContain('#42')
    expect(output).toContain('Build widget')
  })

  it('shows iteration count', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} />)
    const output = lastFrame()!
    expect(output).toContain('3')
    expect(output).toContain('iteration')
  })

  it('formats total elapsed time as Xm Ys', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} />)
    const output = lastFrame()!
    expect(output).toContain('2m 5s')
  })

  it('renders per-iteration timing breakdown', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} />)
    const output = lastFrame()!
    expect(output).toContain('Per-iteration timing:')
    expect(output).toContain('Iteration 1:')
    expect(output).toContain('Iteration 2:')
    expect(output).toContain('Iteration 3:')
    expect(output).toContain('40s')
    expect(output).toContain('45s')
  })

  it('renders blocked screen with reason', () => {
    const { lastFrame } = render(
      <CompletionReport {...baseProps} outcome="blocked" blockedReason="npm install failed" />,
    )
    const output = lastFrame()!
    expect(output).toContain('blocked')
    expect(output).toContain('npm install failed')
  })

  it('renders decide screen with question', () => {
    const { lastFrame } = render(
      <CompletionReport {...baseProps} outcome="decide" decideQuestion="Use Redis or Postgres?" />,
    )
    const output = lastFrame()!
    expect(output).toContain('Decision needed')
    expect(output).toContain('Use Redis or Postgres?')
  })

  it('renders max-iterations screen', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} outcome="max-iterations" />)
    const output = lastFrame()!
    expect(output).toContain('Max iterations reached')
  })

  it('handles null task gracefully', () => {
    const { lastFrame } = render(<CompletionReport {...baseProps} task={null} />)
    const output = lastFrame()!
    expect(output).toContain('Auto')
  })
})
