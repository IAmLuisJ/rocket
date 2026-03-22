import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('checkNodeVersion', () => {
  const originalVersion = process.version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorSpy: any

  beforeEach(() => {
    vi.resetModules()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.defineProperty(process, 'version', { value: originalVersion, writable: true })
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('should exit with code 1 when Node version is below 22', async () => {
    Object.defineProperty(process, 'version', { value: 'v18.17.0', writable: true })
    const { checkNodeVersion } = await import('./preflight.js')
    checkNodeVersion()
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Rocket requires Node.js >=22'))
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('v18.17.0'))
  })

  it('should not exit when Node version is 22+', async () => {
    Object.defineProperty(process, 'version', { value: 'v22.1.0', writable: true })
    const { checkNodeVersion } = await import('./preflight.js')
    checkNodeVersion()
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('should include upgrade URL in error message', async () => {
    Object.defineProperty(process, 'version', { value: 'v20.0.0', writable: true })
    const { checkNodeVersion } = await import('./preflight.js')
    checkNodeVersion()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('https://nodejs.org'))
  })
})

describe('checkAgentStructure', () => {
  it('should be exported', async () => {
    const mod = await import('./preflight.js')
    expect(typeof mod.checkAgentStructure).toBe('function')
  })
})
