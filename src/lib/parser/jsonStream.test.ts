import { describe, it, expect } from 'vitest'
import { JsonStreamParser } from './jsonStream.js'

describe('JsonStreamParser', () => {
  it('parses valid JSON line', () => {
    const parser = new JsonStreamParser()
    const result = parser.feed('{"type":"result","content":"hello"}')
    expect(result.type).toBe('json')
    expect(result.parsed).toEqual({ type: 'result', content: 'hello' })
  })

  it('passes through plain text', () => {
    const parser = new JsonStreamParser()
    const result = parser.feed('just some text output')
    expect(result.type).toBe('text')
    expect(result.content).toBe('just some text output')
  })

  it('handles empty line', () => {
    const parser = new JsonStreamParser()
    const result = parser.feed('')
    expect(result.type).toBe('text')
    expect(result.content).toBe('')
  })

  it('buffers partial JSON across lines', () => {
    const parser = new JsonStreamParser()
    const r1 = parser.feed('{"type":"result",')
    expect(r1.type).toBe('text')

    const r2 = parser.feed('"content":"hello"}')
    expect(r2.type).toBe('json')
    expect(r2.parsed).toEqual({ type: 'result', content: 'hello' })
  })

  it('parses JSON arrays', () => {
    const parser = new JsonStreamParser()
    const result = parser.feed('[1, 2, 3]')
    expect(result.type).toBe('json')
    expect(result.parsed).toEqual([1, 2, 3])
  })
})
