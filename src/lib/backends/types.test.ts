import { describe, it, expect } from 'vitest'
import type { AgentBackend, BackendOptions, ParsedOutput } from './types.js'

describe('backends/types', () => {
  it('BackendOptions accepts prompt with optional fields', () => {
    const opts: BackendOptions = { prompt: 'test prompt' }
    expect(opts.prompt).toBe('test prompt')
    expect(opts.maxIterations).toBeUndefined()
    expect(opts.cwd).toBeUndefined()
  })

  it('BackendOptions accepts all fields', () => {
    const opts: BackendOptions = { prompt: 'test', maxIterations: 5, cwd: '/tmp' }
    expect(opts.maxIterations).toBe(5)
    expect(opts.cwd).toBe('/tmp')
  })

  it('ParsedOutput text variant has content', () => {
    const output: ParsedOutput = { type: 'text', content: 'hello' }
    expect(output.type).toBe('text')
    if (output.type === 'text') {
      expect(output.content).toBe('hello')
    }
  })

  it('ParsedOutput json variant has data', () => {
    const output: ParsedOutput = { type: 'json', data: { key: 'value' } }
    expect(output.type).toBe('json')
    if (output.type === 'json') {
      expect(output.data).toEqual({ key: 'value' })
    }
  })

  it('ParsedOutput complete variant has no extra fields', () => {
    const output: ParsedOutput = { type: 'complete' }
    expect(output.type).toBe('complete')
  })

  it('ParsedOutput blocked variant has reason', () => {
    const output: ParsedOutput = { type: 'blocked', reason: 'no network' }
    if (output.type === 'blocked') {
      expect(output.reason).toBe('no network')
    }
  })

  it('ParsedOutput decide variant has question', () => {
    const output: ParsedOutput = { type: 'decide', question: 'which DB?' }
    if (output.type === 'decide') {
      expect(output.question).toBe('which DB?')
    }
  })

  it('AgentBackend interface has required members', () => {
    // Verify the interface shape via a mock implementation
    const mock: AgentBackend = {
      name: 'test',
      spawn: () => null as never,
      parseOutput: () => null,
    }
    expect(mock.name).toBe('test')
    expect(typeof mock.spawn).toBe('function')
    expect(typeof mock.parseOutput).toBe('function')
  })

  it('discriminated union supports exhaustive switch', () => {
    function describe(output: ParsedOutput): string {
      switch (output.type) {
        case 'text':
          return output.content
        case 'json':
          return JSON.stringify(output.data)
        case 'complete':
          return 'done'
        case 'blocked':
          return output.reason
        case 'decide':
          return output.question
      }
    }

    expect(describe({ type: 'text', content: 'hi' })).toBe('hi')
    expect(describe({ type: 'complete' })).toBe('done')
    expect(describe({ type: 'blocked', reason: 'err' })).toBe('err')
    expect(describe({ type: 'decide', question: 'q?' })).toBe('q?')
  })
})
