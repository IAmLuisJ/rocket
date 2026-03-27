import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copilotBackend } from './copilot.js'

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

describe('copilotBackend', () => {
  it('has name "Copilot CLI"', () => {
    expect(copilotBackend.name).toBe('Copilot CLI')
  })

  it('implements AgentBackend with spawn and parseOutput', () => {
    expect(typeof copilotBackend.spawn).toBe('function')
    expect(typeof copilotBackend.parseOutput).toBe('function')
  })

  describe('spawn', () => {
    it('checks for copilot binary before spawning', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      copilotBackend.spawn('test prompt', { prompt: 'test prompt' })
      expect(mockedExecSync).toHaveBeenCalledWith('which copilot', { stdio: 'ignore' })
    })

    it('throws descriptive error when copilot binary is missing', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found')
      })
      expect(() => copilotBackend.spawn('test', { prompt: 'test' })).toThrow(
        'copilot CLI not found in PATH. Install it from https://github.com/github/gh-copilot',
      )
    })

    it('spawns copilot with --autopilot and --prompt flags', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      copilotBackend.spawn('build the app', { prompt: 'build the app' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'copilot',
        ['--autopilot', '--prompt', 'build the app'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      )
    })

    it('passes cwd from options', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      copilotBackend.spawn('test', { prompt: 'test', cwd: '/tmp/project' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'copilot',
        expect.any(Array),
        expect.objectContaining({ cwd: '/tmp/project' }),
      )
    })

    it('passes shell metacharacters as literal arg without injection', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const malicious = 'test; rm -rf /tmp/test-injection && echo pwned'
      copilotBackend.spawn(malicious, { prompt: malicious })
      const args = mockedSpawn.mock.calls[0][1] as string[]
      expect(args).toContain(malicious)
      expect(args[args.length - 1]).toBe(malicious)
      const spawnOpts = mockedSpawn.mock.calls[0][2] as Record<string, unknown>
      expect(spawnOpts).not.toHaveProperty('shell')
    })

    it('returns a ChildProcess', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const result = copilotBackend.spawn('test', { prompt: 'test' })
      expect(result).toHaveProperty('pid')
    })
  })

  describe('parseOutput', () => {
    it('returns null for empty lines', () => {
      expect(copilotBackend.parseOutput('')).toBeNull()
      expect(copilotBackend.parseOutput('   ')).toBeNull()
    })

    it('returns text type for regular output', () => {
      const result = copilotBackend.parseOutput('Hello world')
      expect(result).toEqual({ type: 'text', content: 'Hello world' })
    })

    it('detects <complete> tag', () => {
      const result = copilotBackend.parseOutput('<complete>')
      expect(result).toEqual({ type: 'complete' })
    })

    it('detects <blocked> tag with reason', () => {
      const result = copilotBackend.parseOutput('<blocked>need credentials</blocked>')
      expect(result).toEqual({ type: 'blocked', reason: 'need credentials' })
    })

    it('detects <decide> tag with question', () => {
      const result = copilotBackend.parseOutput('<decide>Use Redis or Memcached?</decide>')
      expect(result).toEqual({ type: 'decide', question: 'Use Redis or Memcached?' })
    })
  })
})
