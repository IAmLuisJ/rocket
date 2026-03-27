import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  access: vi.fn(),
}))

vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((_msg: string, cb: (answer: string) => void) => cb('n')),
    close: vi.fn(),
  }),
}))

vi.mock('../lib/agent-init.js', () => ({
  createAgentStructure: vi.fn().mockResolvedValue(undefined),
}))

import { access } from 'fs/promises'
import { createInterface } from 'readline'
import { createAgentStructure } from '../lib/agent-init.js'
import { runInit } from './init.js'

describe('runInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates .agent/ structure when it does not exist', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runInit()

    expect(createAgentStructure).toHaveBeenCalledWith(process.cwd())
    expect(logSpy).toHaveBeenCalledWith('✓ Initialized .agent/ structure')
    expect(logSpy).toHaveBeenCalledWith('Created:')
    expect(logSpy).toHaveBeenCalledWith('  .agent/prd/PRD.md')
    expect(logSpy).toHaveBeenCalledWith('  .agent/tasks.json')

    logSpy.mockRestore()
  })

  it('asks for confirmation when .agent/ already exists', async () => {
    vi.mocked(access).mockResolvedValue(undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Default mock answers 'n'
    await runInit()

    expect(createInterface).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith('Aborted.')
    expect(createAgentStructure).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it('proceeds when user confirms with y', async () => {
    vi.mocked(access).mockResolvedValue(undefined)
    vi.mocked(createInterface).mockReturnValue({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    } as unknown as ReturnType<typeof createInterface>)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runInit()

    expect(createAgentStructure).toHaveBeenCalledWith(process.cwd())
    expect(logSpy).toHaveBeenCalledWith('✓ Initialized .agent/ structure')

    logSpy.mockRestore()
  })

  it('prints all created files in success output', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runInit()

    const logCalls = logSpy.mock.calls.map((c) => c[0])
    expect(logCalls).toContain('  .agent/prd/PRD.md')
    expect(logCalls).toContain('  .agent/prd/SUMMARY.md')
    expect(logCalls).toContain('  .agent/logs/LOG.md')
    expect(logCalls).toContain('  .agent/history/')
    expect(logCalls).toContain('  .agent/PROMPT.md')
    expect(logCalls).toContain('  .agent/tasks.json')

    logSpy.mockRestore()
  })

  it('prints next-step instructions after creation', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runInit()

    const logCalls = logSpy.mock.calls.map((c) => c[0])
    expect(logCalls).toContain('Next steps:')
    expect(logCalls).toContain('  📝 Edit .agent/prd/PRD.md with your project requirements')
    expect(logCalls).toContain('  📋 Edit .agent/tasks.json with your task list')
    expect(logCalls).toContain(`  ▶ Then run: \x1b[36mrocket loop\x1b[0m`)

    logSpy.mockRestore()
  })

  it('handles createAgentStructure errors gracefully', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(createAgentStructure).mockRejectedValue(new Error('Permission denied'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit')
    })

    await expect(runInit()).rejects.toThrow('process.exit')
    expect(errorSpy).toHaveBeenCalledWith('Error: Permission denied')
    expect(exitSpy).toHaveBeenCalledWith(1)

    errorSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
