import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import type { AgentBackend } from './backends/types.js'

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>()
  return { ...actual, execSync: vi.fn(actual.execSync) }
})

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

describe('runPreflight', () => {
  let tmpDir: string
  let agentDir: string

  const fakeBackend: AgentBackend = {
    name: 'Copilot CLI',
    spawn: vi.fn() as AgentBackend['spawn'],
    parseOutput: vi.fn(),
  }

  beforeEach(async () => {
    vi.resetModules()
    tmpDir = await mkdtemp(join(tmpdir(), 'preflight-'))
    agentDir = join(tmpDir, '.agent')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('throws with rocket init message if tasks.json is missing', async () => {
    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow('rocket init')
  })

  it('throws with all tasks complete message if no incomplete tasks', async () => {
    await mkdir(agentDir, { recursive: true })
    const tasksData = {
      tasks: [
        {
          id: 1,
          title: 'Done task',
          description: 'Already done',
          category: 'functional',
          passes: true,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(tasksData))

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow('All tasks are complete')
  })

  it('throws with install instructions if backend binary not in PATH', async () => {
    await mkdir(agentDir, { recursive: true })
    const tasksData = {
      tasks: [
        {
          id: 1,
          title: 'Incomplete task',
          description: 'Not done',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(tasksData))

    const { execSync } = await import('child_process')
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockImplementation(() => {
      throw new Error('not found')
    })

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow('copilot not found in PATH')
    mockedExecSync.mockRestore()
  })

  it('does not throw when all checks pass', async () => {
    await mkdir(agentDir, { recursive: true })
    const tasksData = {
      tasks: [
        {
          id: 1,
          title: 'Incomplete task',
          description: 'Not done',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(tasksData))

    const { execSync } = await import('child_process')
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockReturnValue(Buffer.from('/usr/bin/copilot'))

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).resolves.toBeUndefined()
    mockedExecSync.mockRestore()
  })

  it('throws with detailed message when tasks.json has invalid schema', async () => {
    await mkdir(agentDir, { recursive: true })
    const invalidData = {
      tasks: [
        {
          id: 1,
          description: 'Missing title field',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(invalidData))

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow('Invalid tasks.json')
  })

  it('shows field path in validation error message', async () => {
    await mkdir(agentDir, { recursive: true })
    const invalidData = {
      tasks: [
        {
          id: 1,
          title: '',
          description: 'Empty title',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(invalidData))

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow('Path: tasks.0.title')
  })

  it('passes validation with a valid tasks.json', async () => {
    await mkdir(agentDir, { recursive: true })
    const validData = {
      tasks: [
        {
          id: 1,
          title: 'Valid task',
          description: 'Desc',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(validData))

    const { execSync } = await import('child_process')
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockReturnValue(Buffer.from('/usr/bin/copilot'))

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).resolves.toBeUndefined()
    mockedExecSync.mockRestore()
  })

  it('re-throws non-ZodError errors from readTasks', async () => {
    await mkdir(agentDir, { recursive: true })
    await writeFile(join(agentDir, 'tasks.json'), 'not valid json{{{')

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, fakeBackend)).rejects.toThrow()
    // Should not contain "Invalid tasks.json" since it's a JSON parse error, not ZodError
    await expect(runPreflight(agentDir, fakeBackend)).rejects.not.toThrow('Invalid tasks.json')
  })

  it('checks correct binary for each backend', async () => {
    await mkdir(agentDir, { recursive: true })
    const tasksData = {
      tasks: [
        {
          id: 1,
          title: 'Task',
          description: 'Desc',
          category: 'functional',
          passes: false,
          passCondition: 'passes',
        },
      ],
    }
    await writeFile(join(agentDir, 'tasks.json'), JSON.stringify(tasksData))

    const { execSync } = await import('child_process')
    const mockedExecSync = vi.mocked(execSync)
    mockedExecSync.mockImplementation(() => {
      throw new Error('not found')
    })

    const dockerBackend: AgentBackend = {
      name: 'Claude (Docker sandbox)',
      spawn: vi.fn() as AgentBackend['spawn'],
      parseOutput: vi.fn(),
    }

    const { runPreflight } = await import('./preflight.js')
    await expect(runPreflight(agentDir, dockerBackend)).rejects.toThrow('docker not found in PATH')
    mockedExecSync.mockRestore()
  })
})
