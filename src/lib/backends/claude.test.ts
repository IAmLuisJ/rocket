import { describe, it, expect, vi, beforeEach } from 'vitest'
import { claudeBackend } from './claude.js'

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  return {
    ...actual,
    execSync: vi.fn(),
    spawn: vi.fn(() => ({
      pid: 1234,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    })),
  }
})

import { execSync, spawn } from 'child_process'

const mockedExecSync = vi.mocked(execSync)
const mockedSpawn = vi.mocked(spawn)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('claudeBackend', () => {
  it('has name "Claude (direct)"', () => {
    expect(claudeBackend.name).toBe('Claude (direct)')
  })

  it('implements AgentBackend with spawn and parseOutput', () => {
    expect(typeof claudeBackend.spawn).toBe('function')
    expect(typeof claudeBackend.parseOutput).toBe('function')
  })

  describe('spawn', () => {
    it('checks for claude binary before spawning', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      claudeBackend.spawn('test prompt', { prompt: 'test prompt' })
      expect(mockedExecSync).toHaveBeenCalledWith('which claude', { stdio: 'ignore' })
    })

    it('throws descriptive error when claude binary is missing', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found')
      })
      expect(() => claudeBackend.spawn('test', { prompt: 'test' })).toThrow(
        'claude CLI not found in PATH. Install Claude Code from https://claude.ai/download',
      )
    })

    it('spawns claude with --model opus and -p flags', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      claudeBackend.spawn('build the app', { prompt: 'build the app' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'claude',
        ['--model', 'opus', '-p', 'build the app'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      )
    })

    it('passes cwd from options', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      claudeBackend.spawn('test', { prompt: 'test', cwd: '/tmp/project' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({ cwd: '/tmp/project' }),
      )
    })

    it('passes shell metacharacters as literal arg without injection', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const malicious = 'test; rm -rf /tmp/test-injection && echo pwned'
      claudeBackend.spawn(malicious, { prompt: malicious })
      const args = mockedSpawn.mock.calls[0][1] as string[]
      expect(args).toContain(malicious)
      expect(args[args.length - 1]).toBe(malicious)
      const spawnOpts = mockedSpawn.mock.calls[0][2] as Record<string, unknown>
      expect(spawnOpts).not.toHaveProperty('shell')
    })

    it('returns a ChildProcess', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const result = claudeBackend.spawn('test', { prompt: 'test' })
      expect(result).toHaveProperty('pid')
    })
  })

  describe('parseOutput', () => {
    it('returns null for empty lines', () => {
      expect(claudeBackend.parseOutput('')).toBeNull()
      expect(claudeBackend.parseOutput('   ')).toBeNull()
    })

    it('returns text type for regular output', () => {
      const result = claudeBackend.parseOutput('Hello world')
      expect(result).toEqual({ type: 'text', content: 'Hello world' })
    })

    it('detects <complete> tag', () => {
      const result = claudeBackend.parseOutput('<complete>')
      expect(result).toEqual({ type: 'complete' })
    })

    it('detects <blocked> tag with reason', () => {
      const result = claudeBackend.parseOutput('<blocked>need credentials</blocked>')
      expect(result).toEqual({ type: 'blocked', reason: 'need credentials' })
    })

    it('detects <decide> tag with question', () => {
      const result = claudeBackend.parseOutput('<decide>Use Redis or Memcached?</decide>')
      expect(result).toEqual({ type: 'decide', question: 'Use Redis or Memcached?' })
    })
  })
})
