import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(
      JSON.stringify({
        tasks: [
          {
            id: 1,
            title: 'Test task',
            description: 'A test',
            category: 'functional',
            passes: false,
            passCondition: 'it works',
          },
        ],
      }),
    ),
    writeFileSync: vi.fn(),
  }
})

vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() }),
}))

vi.mock('react', () => ({
  default: { createElement: vi.fn() },
}))

import { existsSync, readFileSync } from 'fs'
import { render } from 'ink'
import React from 'react'
import { runTasks } from './tasks.js'

describe('runTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        tasks: [
          {
            id: 1,
            title: 'Test task',
            description: 'A test',
            category: 'functional',
            passes: false,
            passCondition: 'it works',
          },
        ],
      }),
    )
  })

  it('renders TasksApp when tasks exist', async () => {
    await runTasks({})
    expect(render).toHaveBeenCalledTimes(1)
    expect(React.createElement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tasks: expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      }),
    )
  })

  it('shows error and exits when tasks.json is missing', async () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit')
    })

    await expect(runTasks({})).rejects.toThrow('process.exit')
    expect(errorSpy).toHaveBeenCalledWith("No .agent/tasks.json found. Run 'rocket init' first.")
    expect(exitSpy).toHaveBeenCalledWith(1)

    errorSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('shows message when task list is empty', async () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ tasks: [] }))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runTasks({})
    expect(logSpy).toHaveBeenCalledWith('No tasks found in tasks.json')
    expect(render).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it('passes initialFilter from options', async () => {
    await runTasks({ filter: 'complete' })
    expect(React.createElement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ initialFilter: 'complete' }),
    )
  })
})
