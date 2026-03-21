import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type ChildProcess } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

vi.mock('os', () => ({
  platform: vi.fn(),
}))

import { spawn } from 'child_process'
import { platform } from 'os'

const mockPlatform = vi.mocked(platform)
const mockSpawn = vi.mocked(spawn)

describe('caffeinate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('start() on darwin spawns caffeinate -i', async () => {
    mockPlatform.mockReturnValue('darwin')
    const fakeProcess = { kill: vi.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(fakeProcess)

    const { startCaffeinate, stopCaffeinate } = await import('./caffeinate.js')
    startCaffeinate()

    expect(mockSpawn).toHaveBeenCalledWith('caffeinate', ['-i'], {
      stdio: 'ignore',
      detached: false,
    })

    // Cleanup
    stopCaffeinate()
  })

  it('start() on linux does not spawn anything', async () => {
    mockPlatform.mockReturnValue('linux')

    const { startCaffeinate } = await import('./caffeinate.js')
    startCaffeinate()

    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('start() does not spawn twice if already running', async () => {
    mockPlatform.mockReturnValue('darwin')
    const fakeProcess = { kill: vi.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(fakeProcess)

    const { startCaffeinate, stopCaffeinate } = await import('./caffeinate.js')
    startCaffeinate()
    startCaffeinate()

    expect(mockSpawn).toHaveBeenCalledTimes(1)

    // Cleanup
    stopCaffeinate()
  })

  it('stop() with a process calls kill()', async () => {
    mockPlatform.mockReturnValue('darwin')
    const fakeProcess = { kill: vi.fn() } as unknown as ChildProcess
    mockSpawn.mockReturnValue(fakeProcess)

    const { startCaffeinate, stopCaffeinate } = await import('./caffeinate.js')
    startCaffeinate()
    stopCaffeinate()

    expect(fakeProcess.kill).toHaveBeenCalled()
  })

  it('stop() is safe to call when not started', async () => {
    const { stopCaffeinate } = await import('./caffeinate.js')
    expect(() => stopCaffeinate()).not.toThrow()
  })
})
