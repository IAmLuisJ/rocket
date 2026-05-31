import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ChildProcess } from 'child_process'
import type { AgentBackend } from '../backends/types.js'
import { runDesktopLoop } from './loopService.js'

describe('desktop loop service', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-desktop-loop-'))
    await mkdir(join(tmpDir, '.agent', 'logs'), { recursive: true })
    await mkdir(join(tmpDir, '.agent', 'history'), { recursive: true })
    await writeFile(join(tmpDir, '.agent', 'PROMPT.md'), '# Prompt')
    await writeFile(
      join(tmpDir, '.agent', 'tasks.json'),
      JSON.stringify({
        tasks: [
          {
            id: 1,
            title: 'Build GUI',
            description: 'Add desktop app',
            category: 'ui-ux',
            passes: false,
            passCondition: 'GUI runs loop',
          },
        ],
      }),
    )
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('runs the existing loop harness and emits desktop loop events', async () => {
    const emit = vi.fn()
    const backend = createBackend(['Working', '<complete>'])

    const dashboard = await runDesktopLoop({
      projectRoot: tmpDir,
      backend,
      maxIterations: 1,
      taskId: 1,
      caffeinate: false,
      emit,
    })

    expect(emit).toHaveBeenCalledWith({ type: 'started', taskId: 1, backendName: 'Fake Backend' })
    expect(emit).toHaveBeenCalledWith({ type: 'output', line: 'Working' })
    expect(emit).toHaveBeenCalledWith({ type: 'complete' })
    expect(emit).toHaveBeenCalledWith({ type: 'finished', dashboard })
    expect(dashboard.tasks[0].id).toBe(1)
  })
})

function createBackend(lines: string[]): AgentBackend {
  return {
    name: 'Fake Backend',
    spawn: () => createChild(lines),
    parseOutput: (line) => ({ type: 'text', content: line }),
  }
}

function createChild(lines: string[]): ChildProcess {
  const child = new EventEmitter() as ChildProcess
  const stdout = new PassThrough()
  child.stdout = stdout
  child.stderr = null
  child.stdin = null
  let exitCode: number | null = null
  Object.defineProperty(child, 'exitCode', {
    configurable: true,
    get: () => exitCode,
  })
  child.kill = vi.fn(() => true) as ChildProcess['kill']

  queueMicrotask(() => {
    for (const line of lines) stdout.write(`${line}\n`)
    stdout.end()
    exitCode = 0
    child.emit('close', 0)
  })

  return child
}
