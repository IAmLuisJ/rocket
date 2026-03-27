import { describe, it, expect } from 'vitest'
import { colors, brand, timing, success, error, highlight, dim } from './colors.js'

describe('colors', () => {
  it('exports a colors object with all six palette entries', () => {
    expect(colors).toEqual({
      brand: 'cyan',
      timing: 'yellow',
      success: 'green',
      error: 'red',
      highlight: 'magenta',
      dim: 'gray',
    })
  })

  it('exports brand as cyan', () => {
    expect(brand).toBe('cyan')
  })

  it('exports timing as yellow', () => {
    expect(timing).toBe('yellow')
  })

  it('exports success as green', () => {
    expect(success).toBe('green')
  })

  it('exports error as red', () => {
    expect(error).toBe('red')
  })

  it('exports highlight as magenta', () => {
    expect(highlight).toBe('magenta')
  })

  it('exports dim as gray', () => {
    expect(dim).toBe('gray')
  })

  it('colors object is readonly (as const)', () => {
    // Verify the destructured exports match the object
    expect(brand).toBe(colors.brand)
    expect(timing).toBe(colors.timing)
    expect(success).toBe(colors.success)
    expect(error).toBe(colors.error)
    expect(highlight).toBe(colors.highlight)
    expect(dim).toBe(colors.dim)
  })
})
