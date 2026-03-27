import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'ink-testing-library'
import { IterationHeader } from './IterationHeader.js'

describe('IterationHeader', () => {
  let originalColumns: number | undefined

  beforeEach(() => {
    originalColumns = process.stdout.columns
  })

  afterEach(() => {
    Object.defineProperty(process.stdout, 'columns', {
      value: originalColumns,
      writable: true,
      configurable: true,
    })
  })

  it('renders three lines with bars and iteration info', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: 40,
      writable: true,
      configurable: true,
    })
    const { lastFrame } = render(<IterationHeader n={2} max={10} taskId={42} />)
    const lines = lastFrame()!.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('▓')
    expect(lines[2]).toContain('▓')
  })

  it('shows iteration number and task id in middle line', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: 40,
      writable: true,
      configurable: true,
    })
    const { lastFrame } = render(<IterationHeader n={3} max={5} taskId={99} />)
    const output = lastFrame()!
    expect(output).toContain('Iteration')
    expect(output).toContain('3')
    expect(output).toContain('of 5')
    expect(output).toContain('Task #')
    expect(output).toContain('99')
  })

  it('caps bar width at 60 for wide terminals', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: 200,
      writable: true,
      configurable: true,
    })
    const { lastFrame } = render(<IterationHeader n={1} max={1} taskId={1} />)
    const lines = lastFrame()!.split('\n')
    // Bar should be exactly 60 characters of ▓
    expect(lines[0]).toBe('▓'.repeat(60))
  })

  it('defaults to 40 when columns is undefined', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    const { lastFrame } = render(<IterationHeader n={1} max={1} taskId={1} />)
    const lines = lastFrame()!.split('\n')
    expect(lines[0]).toBe('▓'.repeat(40))
  })

  it('uses terminal width when narrower than 60', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: 30,
      writable: true,
      configurable: true,
    })
    const { lastFrame } = render(<IterationHeader n={1} max={1} taskId={1} />)
    const lines = lastFrame()!.split('\n')
    expect(lines[0]).toBe('▓'.repeat(30))
  })
})
