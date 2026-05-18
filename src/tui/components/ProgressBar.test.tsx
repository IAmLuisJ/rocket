import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { ProgressBar } from './ProgressBar.js'

describe('ProgressBar', () => {
  it('renders an empty bar at 0 percent', () => {
    const { lastFrame } = render(<ProgressBar percent={0} complete={0} total={10} width={10} />)
    expect(lastFrame()).toContain('░░░░░░░░░░')
    expect(lastFrame()).toContain('0/10 0%')
  })

  it('renders a half-filled bar at 50 percent', () => {
    const { lastFrame } = render(<ProgressBar percent={50} complete={5} total={10} width={10} />)
    expect(lastFrame()).toContain('█████░░░░░')
    expect(lastFrame()).toContain('5/10 50%')
  })

  it('renders a full bar at 100 percent', () => {
    const { lastFrame } = render(<ProgressBar percent={100} complete={10} total={10} width={10} />)
    expect(lastFrame()).toContain('██████████')
    expect(lastFrame()).toContain('10/10 100%')
  })

  it('does not throw when terminal width is unavailable', () => {
    const originalColumns = process.stdout.columns
    Object.defineProperty(process.stdout, 'columns', { configurable: true, value: undefined })

    expect(() => render(<ProgressBar percent={62} complete={74} total={120} />)).not.toThrow()

    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: originalColumns,
    })
  })
})
