import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime.js'

describe('formatTime', () => {
  it('formats milliseconds under 1000 as ms', () => {
    expect(formatTime(500)).toBe('500ms')
    expect(formatTime(999)).toBe('999ms')
  })

  it('formats 1000+ milliseconds as seconds', () => {
    expect(formatTime(1000)).toBe('1s')
    expect(formatTime(1500)).toBe('2s')
    expect(formatTime(45000)).toBe('45s')
  })

  it('rounds seconds to nearest integer', () => {
    expect(formatTime(1400)).toBe('1s')
    expect(formatTime(1600)).toBe('2s')
  })

  it('handles zero milliseconds', () => {
    expect(formatTime(0)).toBe('0ms')
  })

  it('handles large durations', () => {
    expect(formatTime(300000)).toBe('300s')
  })
})
