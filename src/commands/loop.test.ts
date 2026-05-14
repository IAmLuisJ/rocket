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
  start: vi.fn().mockReturnValue(null),
  stop: vi.fn(),
}))

vi.mock('../lib/log.js', () => ({
  ensureLogFile: vi.fn(),
}))

vi.mock('../lib/prompt.js', () => ({
  getDefaultPromptContent: vi.fn().mockReturnValue('# Prompt'),
}))

vi.mock('../tui/RocketLoopApp.js', () => ({
  RocketLoopApp: vi.fn(),
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

describe('loop command renders RocketLoopApp', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('renders RocketLoopApp with correct props when preflight passes', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({ maxIterations: '3' })

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        tasks: fakeTasks,
        backend: fakeBackend,
        backendName: 'Copilot CLI',
        maxIterations: 3,
      }),
    )
  })

  it('passes agentDir prop to RocketLoopApp', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({ maxIterations: '5' })

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        agentDir: expect.stringContaining('.agent'),
      }),
    )
  })

  it('passes projectRoot and selectTask=false to RocketLoopApp by default', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({})

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        projectRoot: expect.stringContaining('Rocket'),
        selectTask: false,
      }),
    )
  })

  it('passes caffeinate=false to RocketLoopApp when --no-caffeinate is used', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({ caffeinate: false })

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        caffeinate: false,
      }),
    )
  })

  it('passes selectTask=true when requested', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({ select: true })

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        selectTask: true,
      }),
    )
  })

  it('defaults maxIterations to 10 when not specified', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)
    const { readTasks, getIncompleteTasks } = await import('../lib/tasks/reader.js')
    const fakeTasks = [{ id: 1, title: 'Test', passes: false }]
    vi.mocked(readTasks).mockReturnValue({ tasks: fakeTasks } as ReturnType<typeof readTasks>)
    vi.mocked(getIncompleteTasks).mockReturnValue(
      fakeTasks as ReturnType<typeof getIncompleteTasks>,
    )
    const fakeBackend = { name: 'Copilot CLI', spawn: vi.fn(), parseOutput: vi.fn() }
    const { getBackend } = await import('../lib/backends/index.js')
    vi.mocked(getBackend).mockReturnValue(fakeBackend as ReturnType<typeof getBackend>)
    const React = await import('react')
    const createSpy = vi.spyOn(React.default, 'createElement')

    const { runLoop } = await import('./loop.js')
    await runLoop({})

    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxIterations: 10,
      }),
    )
  })
})

describe('loop command --max-iterations flag registration', () => {
  it('loop command has --max-iterations and --select flags', async () => {
    const { program } = await import('../cli.js')
    const loopCmd = program.commands.find((c) => c.name() === 'loop')
    expect(loopCmd).toBeDefined()
    const helpText = loopCmd!.helpInformation()
    expect(helpText).toContain('--max-iterations')
    expect(helpText).toContain('-n')
    expect(helpText).toContain('Maximum iterations')
    expect(helpText).toContain('--select')
    expect(helpText).toContain('Choose a task before starting')
  })
})
