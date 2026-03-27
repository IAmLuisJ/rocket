import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { SpinnerPreview } from './SpinnerPreview.js'

// Mock ink-spinner to avoid animation timers in tests
vi.mock('ink-spinner', async () => {
  const { Text } = await import('ink')
  return {
    default: () => <Text>⠋</Text>,
  }
})

describe('SpinnerPreview', () => {
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

  it('renders spinner and output lines', () => {
    const { lastFrame } = render(<SpinnerPreview lines={['line one', 'line two']} />)
    const output = lastFrame()!
    expect(output).toContain('line one')
    expect(output).toContain('line two')
  })

  it('shows only last 5 lines when given more', () => {
    const lines = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const { lastFrame } = render(<SpinnerPreview lines={lines} />)
    const output = lastFrame()!
    expect(output).not.toContain('a')
    expect(output).not.toContain('b')
    expect(output).toContain('c')
    expect(output).toContain('g')
  })

  it('truncates long lines to terminal width minus 4', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: 20,
      writable: true,
      configurable: true,
    })
    const longLine = 'x'.repeat(30)
    const { lastFrame } = render(<SpinnerPreview lines={[longLine]} />)
    const output = lastFrame()!
    // maxWidth = 20 - 4 = 16, so line should be 16 chars + '…'
    expect(output).toContain('x'.repeat(16) + '…')
    expect(output).not.toContain('x'.repeat(17))
  })

  it('renders empty when no lines provided', () => {
    const { lastFrame } = render(<SpinnerPreview lines={[]} />)
    const output = lastFrame()!
    // Should still have spinner but no text lines
    expect(output).toBeTruthy()
  })

  it('defaults to 80 columns when process.stdout.columns is undefined', () => {
    Object.defineProperty(process.stdout, 'columns', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    // maxWidth = 80 - 4 = 76, a 76-char line should NOT be truncated
    const line = 'y'.repeat(76)
    const { lastFrame } = render(<SpinnerPreview lines={[line]} />)
    const output = lastFrame()!
    expect(output).toContain('y'.repeat(76))
    expect(output).not.toContain('…')
  })
})
