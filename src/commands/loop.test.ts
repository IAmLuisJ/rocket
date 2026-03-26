import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    writeFileSync: vi.fn(),
  }
})

vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() }),
}))

vi.mock('react', () => ({
  default: { createElement: vi.fn() },
}))

vi.mock('../lib/preflight.js', () => ({
  checkAgentStructure: vi.fn().mockReturnValue({ ok: true, errors: [] }),
  checkBackendAvailability: vi
    .fn()
    .mockReturnValue({ copilot: true, claude: false, docker: false }),
}))

vi.mock('../lib/tasks/reader.js', () => ({
  readTasks: vi.fn().mockReturnValue({ tasks: [] }),
  getIncompleteTasks: vi.fn().mockReturnValue([]),
}))

vi.mock('../lib/backends/index.js', () => ({
  getBackend: vi.fn().mockReturnValue('copilot'),
}))

vi.mock('../lib/caffeinate.js', () => ({
  startCaffeinate: vi.fn(),
  stopCaffeinate: vi.fn(),
}))

vi.mock('../lib/log.js', () => ({
  ensureLogFile: vi.fn(),
}))

vi.mock('../lib/prompt.js', () => ({
  getDefaultPromptContent: vi.fn().mockReturnValue('# Prompt'),
}))

vi.mock('../tui/RocketLoop.js', () => ({
  RocketLoop: vi.fn(),
}))

describe('loop command --max-iterations validation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConsoleError: any

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('validates non-integer --max-iterations value', async () => {
    const { runLoop } = await import('./loop.js')
    await expect(runLoop({ maxIterations: 'abc' })).rejects.toThrow('process.exit called')
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error: --max-iterations must be a positive integer',
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates negative --max-iterations value', async () => {
    const { runLoop } = await import('./loop.js')
    await expect(runLoop({ maxIterations: '-1' })).rejects.toThrow('process.exit called')
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error: --max-iterations must be a positive integer',
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates zero --max-iterations value', async () => {
    const { runLoop } = await import('./loop.js')
    await expect(runLoop({ maxIterations: '0' })).rejects.toThrow('process.exit called')
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error: --max-iterations must be a positive integer',
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('accepts valid positive integer --max-iterations', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(false)
    const { runLoop } = await import('./loop.js')
    // Will exit(1) because .agent/ dir doesn't exist, but not because of validation
    await expect(runLoop({ maxIterations: '5' })).rejects.toThrow('process.exit called')
    // The error should be about missing .agent/ dir, not about max-iterations
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('.agent/'))
  })
})

describe('loop command --max-iterations flag registration', () => {
  it('loop command has --max-iterations flag with default of 10', async () => {
    const { program } = await import('../cli.js')
    const loopCmd = program.commands.find((c) => c.name() === 'loop')
    expect(loopCmd).toBeDefined()
    const helpText = loopCmd!.helpInformation()
    expect(helpText).toContain('--max-iterations')
    expect(helpText).toContain('-n')
    expect(helpText).toContain('Maximum iterations')
  })
})
