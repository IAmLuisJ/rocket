import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dockerBackend } from './docker.js'

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  return {
    ...actual,
    execSync: vi.fn(),
    spawn: vi.fn(() => ({
      pid: 5678,
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

describe('dockerBackend', () => {
  it('has name "Claude (Docker sandbox)"', () => {
    expect(dockerBackend.name).toBe('Claude (Docker sandbox)')
  })

  it('implements AgentBackend with spawn and parseOutput', () => {
    expect(typeof dockerBackend.spawn).toBe('function')
    expect(typeof dockerBackend.parseOutput).toBe('function')
  })

  describe('spawn', () => {
    it('checks for docker binary before spawning', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      dockerBackend.spawn('test prompt', { prompt: 'test prompt' })
      expect(mockedExecSync).toHaveBeenCalledWith('which docker', { stdio: 'ignore' })
    })

    it('throws descriptive error when docker binary is missing', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found')
      })
      expect(() => dockerBackend.spawn('test', { prompt: 'test' })).toThrow(
        'docker not found in PATH. Install Docker from https://docker.com',
      )
    })

    it('spawns docker sandbox run with correct arguments', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      dockerBackend.spawn('build the app', { prompt: 'build the app' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'docker',
        ['sandbox', 'run', 'claude', '.', '--', '--model', 'opus', '-p', 'build the app'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      )
    })

    it('passes cwd from options', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      dockerBackend.spawn('test', { prompt: 'test', cwd: '/tmp/project' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'docker',
        expect.any(Array),
        expect.objectContaining({ cwd: '/tmp/project' }),
      )
    })

    it('defaults cwd to process.cwd() when not provided', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      dockerBackend.spawn('test', { prompt: 'test' })
      expect(mockedSpawn).toHaveBeenCalledWith(
        'docker',
        expect.any(Array),
        expect.objectContaining({ cwd: process.cwd() }),
      )
    })

    it('passes shell metacharacters as literal arg without injection', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const malicious = 'test; rm -rf /tmp/test-injection && echo pwned'
      dockerBackend.spawn(malicious, { prompt: malicious })
      const args = mockedSpawn.mock.calls[0][1] as string[]
      expect(args).toContain(malicious)
      expect(args[args.length - 1]).toBe(malicious)
      const spawnOpts = mockedSpawn.mock.calls[0][2] as Record<string, unknown>
      expect(spawnOpts).not.toHaveProperty('shell')
    })

    it('returns a ChildProcess', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''))
      const result = dockerBackend.spawn('test', { prompt: 'test' })
      expect(result).toHaveProperty('pid')
    })
  })

  describe('parseOutput', () => {
    it('returns null for empty lines', () => {
      expect(dockerBackend.parseOutput('')).toBeNull()
      expect(dockerBackend.parseOutput('   ')).toBeNull()
    })

    it('returns text type for regular output', () => {
      const result = dockerBackend.parseOutput('Hello world')
      expect(result).toEqual({ type: 'text', content: 'Hello world' })
    })

    it('detects <complete> tag', () => {
      const result = dockerBackend.parseOutput('<complete>')
      expect(result).toEqual({ type: 'complete' })
    })

    it('detects <blocked> tag with reason', () => {
      const result = dockerBackend.parseOutput('<blocked>need credentials</blocked>')
      expect(result).toEqual({ type: 'blocked', reason: 'need credentials' })
    })

    it('detects <decide> tag with question', () => {
      const result = dockerBackend.parseOutput('<decide>Use Redis or Memcached?</decide>')
      expect(result).toEqual({ type: 'decide', question: 'Use Redis or Memcached?' })
    })
  })
})
