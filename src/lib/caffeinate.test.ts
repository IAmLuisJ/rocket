import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type ChildProcess } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

import { spawn } from 'child_process'

const mockSpawn = vi.mocked(spawn)

describe('caffeinate', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('start() spawns caffeinate -i on macOS and returns ChildProcess', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    const fakeProcess = { kill: vi.fn(), pid: 123 } as unknown as ChildProcess
    mockSpawn.mockReturnValue(fakeProcess)

    const { start } = await import('./caffeinate.js')
    const proc = start()

    expect(mockSpawn).toHaveBeenCalledWith('caffeinate', ['-i'], {
      stdio: 'ignore',
      detached: false,
    })
    expect(proc).toBe(fakeProcess)
  })

  it('start() returns null on Linux without throwing', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const { start } = await import('./caffeinate.js')
    const proc = start()

    expect(proc).toBeNull()
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('stop(proc) kills the caffeinate process with SIGTERM', async () => {
    const fakeProcess = { kill: vi.fn() } as unknown as ChildProcess

    const { stop } = await import('./caffeinate.js')
    stop(fakeProcess)

    expect(fakeProcess.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('stop(null) is a no-op', async () => {
    const { stop } = await import('./caffeinate.js')
    expect(() => stop(null)).not.toThrow()
  })

  it('stop() handles already-exited process gracefully', async () => {
    const fakeProcess = {
      kill: vi.fn(() => {
        throw new Error('process already exited')
      }),
    } as unknown as ChildProcess

    const { stop } = await import('./caffeinate.js')
    expect(() => stop(fakeProcess)).not.toThrow()
  })
})
