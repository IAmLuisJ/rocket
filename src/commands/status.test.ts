import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { runStatus } from './status.js'

vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() }),
}))

const originalCwd = process.cwd()

describe('runStatus', () => {
  let tmpDir: string
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-status-'))
    process.chdir(tmpDir)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    logSpy.mockRestore()
    errorSpy.mockRestore()
    await rm(tmpDir, { recursive: true, force: true })
  })

  async function writeTasks() {
    await mkdir(join(tmpDir, '.agent'), { recursive: true })
    await writeFile(
      join(tmpDir, '.agent', 'tasks.json'),
      JSON.stringify({
        tasks: [
          {
            id: 1,
            title: 'Done config',
            description: 'desc',
            category: 'config',
            passes: true,
            passCondition: 'cond',
          },
          {
            id: 2,
            title: 'Build API',
            description: 'desc',
            category: 'api-endpoint',
            passes: false,
            passCondition: 'cond',
          },
        ],
      }),
    )
  }

  it('prints a helpful message when tasks.json is missing', async () => {
    await runStatus({})

    expect(logSpy).toHaveBeenCalledWith(
      'No tasks found — run `rocket init` to set up your project.',
    )
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('prints structured JSON for --json', async () => {
    await writeTasks()

    await runStatus({ json: true })

    const output = logSpy.mock.calls[0][0] as string
    expect(JSON.parse(output)).toMatchObject({
      overall: { complete: 1, total: 2, percent: 50 },
      loopSessions: 0,
      totalRuntimeSeconds: 0,
    })
  })

  it('prints incomplete tasks in the expected format', async () => {
    await writeTasks()

    await runStatus({ incomplete: true })

    expect(logSpy).toHaveBeenCalledWith('#2 · Build API [api-endpoint]')
  })

  it('applies category filtering to incomplete output', async () => {
    await writeTasks()

    await runStatus({ incomplete: true, category: 'config' })

    expect(logSpy).not.toHaveBeenCalledWith('#2 · Build API [api-endpoint]')
  })

  it('exits non-zero for an unknown category', async () => {
    await writeTasks()
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    await expect(runStatus({ category: 'security' })).rejects.toThrow('exit')

    expect(errorSpy).toHaveBeenCalledWith('Unknown category: security. Valid: api-endpoint, config')
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
