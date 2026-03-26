import { describe, it, expect } from 'vitest'
import { createJsonStreamParser } from './jsonStream.js'

describe('createJsonStreamParser', () => {
  it('parses valid JSON line', () => {
    const parser = createJsonStreamParser()
    const result = parser.process('{"type":"result","content":"hello"}')
    expect(result).toEqual({
      type: 'json',
      data: { type: 'result', content: 'hello' },
    })
  })

  it('passes through plain text', () => {
    const parser = createJsonStreamParser()
    const result = parser.process('just some text output')
    expect(result).toEqual({ type: 'text', content: 'just some text output' })
  })

  it('returns null for empty line', () => {
    const parser = createJsonStreamParser()
    expect(parser.process('')).toBeNull()
  })

  it('returns null for whitespace-only line', () => {
    const parser = createJsonStreamParser()
    expect(parser.process('   ')).toBeNull()
  })

  it('buffers partial JSON across lines', () => {
    const parser = createJsonStreamParser()
    const r1 = parser.process('{"type":"result",')
    expect(r1).toBeNull()

    const r2 = parser.process('"content":"hello"}')
    expect(r2).toEqual({
      type: 'json',
      data: { type: 'result', content: 'hello' },
    })
  })

  it('parses JSON arrays', () => {
    const parser = createJsonStreamParser()
    const result = parser.process('[1, 2, 3]')
    expect(result).toEqual({ type: 'json', data: [1, 2, 3] })
  })

  it('returns text for non-JSON lines that do not start with { or [', () => {
    const parser = createJsonStreamParser()
    const result = parser.process('Hello world')
    expect(result).toEqual({ type: 'text', content: 'Hello world' })
  })

  it('does not buffer lines that cannot be JSON start', () => {
    const parser = createJsonStreamParser()
    const r1 = parser.process('plain text line')
    expect(r1).toEqual({ type: 'text', content: 'plain text line' })

    // Next valid JSON should still parse fine
    const r2 = parser.process('{"ok":true}')
    expect(r2).toEqual({ type: 'json', data: { ok: true } })
  })

  it('handles multi-line JSON array', () => {
    const parser = createJsonStreamParser()
    expect(parser.process('[1,')).toBeNull()
    expect(parser.process('2,')).toBeNull()
    const r = parser.process('3]')
    expect(r).toEqual({ type: 'json', data: [1, 2, 3] })
  })

  it('independent parsers do not share state', () => {
    const p1 = createJsonStreamParser()
    const p2 = createJsonStreamParser()
    p1.process('{"partial":')
    const r = p2.process('{"complete":true}')
    expect(r).toEqual({ type: 'json', data: { complete: true } })
  })
})
