import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PassThrough } from 'stream'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import type { AgentBackend } from './backends/types.js'
import type { Task } from './tasks/schema.js'

vi.mock('./prompt.js', () => ({
  buildLoopPrompt: vi.fn(() => 'mocked prompt'),
}))

const mockSaveIteration = vi.fn()
vi.mock('./history.js', () => ({
  saveIteration: (...args: unknown[]) => mockSaveIteration(...args),
}))

const mockAppendSessionLog = vi.fn()
vi.mock('./log.js', () => ({
  appendSessionLog: (...args: unknown[]) => mockAppendSessionLog(...args),
}))

const mockCaffProc = { kill: vi.fn(), pid: 9999 }
const mockStart = vi.fn(() => mockCaffProc)
const mockStop = vi.fn()
vi.mock('./caffeinate.js', () => ({
  start: () => mockStart(),
  stop: (proc: unknown) => mockStop(proc),
}))

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Test task',
    description: 'A test task',
    category: 'functional',
    passes: false,
    passCondition: 'Tests pass',
    ...overrides,
  }
}

function createMockChild(lines: string[]): ChildProcess {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const stdin = new PassThrough()

  const child = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    stdin,
    pid: 1234,
    killed: false,
    connected: false,
    exitCode: null as number | null,
    signalCode: null as string | null,
    kill: vi.fn(),
    send: vi.fn(),
    disconnect: vi.fn(),
    unref: vi.fn(),
    ref: vi.fn(),
    stdio: [stdin, stdout, stderr, null, null] as ChildProcess['stdio'],
    [Symbol.dispose]: vi.fn(),
  }) as unknown as ChildProcess

  // Push lines then close stdout; emit 'close' when stdout finishes draining
  process.nextTick(() => {
    for (const line of lines) {
      stdout.write(line + '\n')
    }
    stdout.end()
  })

  stdout.on('end', () => {
    setTimeout(() => {
      ;(child as unknown as { exitCode: number }).exitCode = 0
      child.emit('close', 0)
    }, 5)
  })

  return child
}

function createMockBackend(lines: string[]): AgentBackend {
  return {
    name: 'mock',
    spawn: vi.fn(() => createMockChild(lines)),
    parseOutput: vi.fn(() => null),
  }
}

async function collectEvents(gen: AsyncGenerator<unknown>): Promise<unknown[]> {
  const events: unknown[] = []
  for await (const event of gen) {
    events.push(event)
  }
  return events
}

describe('loop-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveIteration.mockResolvedValue(undefined)
    mockAppendSessionLog.mockResolvedValue(undefined)
  })

  it('yields iteration-start and output events', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Hello world', 'Line 2'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }),
    )

    expect(events[0]).toEqual({ type: 'iteration-start', n: 1 })
    expect(events[1]).toEqual({ type: 'output', line: 'Hello world' })
    expect(events[2]).toEqual({ type: 'output', line: 'Line 2' })
    expect(events).toContainEqual(expect.objectContaining({ type: 'timing', iterationN: 1 }))
    expect(events[events.length - 1]).toEqual({ type: 'max-reached' })
  })

  it('yields complete when <complete> tag detected', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Working...', '<complete>'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }),
    )

    expect(events).toContainEqual({ type: 'complete' })
    // Should not reach max-reached
    expect(events).not.toContainEqual({ type: 'max-reached' })
  })

  it('yields blocked with reason when <blocked> tag detected', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Need help', '<blocked>Missing API key</blocked>'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }),
    )

    expect(events).toContainEqual({
      type: 'blocked',
      reason: 'Missing API key',
    })
    expect(events).not.toContainEqual({ type: 'max-reached' })
  })

  it('yields decide with question when <decide> tag detected', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Thinking...', '<decide>Use REST or GraphQL?</decide>'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }),
    )

    expect(events).toContainEqual({
      type: 'decide',
      question: 'Use REST or GraphQL?',
    })
    expect(events).not.toContainEqual({ type: 'max-reached' })
  })

  it('yields max-reached after all iterations with no exit tags', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Working...'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 2, agentDir: '/tmp/test' }),
    )

    // Should have 2 iteration-starts
    const starts = events.filter((e) => (e as { type: string }).type === 'iteration-start')
    expect(starts).toHaveLength(2)
    expect(events[events.length - 1]).toEqual({ type: 'max-reached' })
  })

  it('terminates generator after complete event', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<complete>'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 10, agentDir: '/tmp/test' }),
    )

    // Should only have 1 iteration-start (stopped after first iteration)
    const starts = events.filter((e) => (e as { type: string }).type === 'iteration-start')
    expect(starts).toHaveLength(1)
  })

  it('yields timing event with elapsed milliseconds', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Done'])
    const task = createMockTask()

    const events = await collectEvents(
      runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }),
    )

    const timing = events.find((e) => (e as { type: string }).type === 'timing') as
      | { type: string; iterationN: number; elapsedMs: number }
      | undefined
    expect(timing).toBeDefined()
    expect(timing!.iterationN).toBe(1)
    expect(typeof timing!.elapsedMs).toBe('number')
    expect(timing!.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('starts caffeinate before loop and stops after normal exit', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<complete>'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }))

    expect(mockStart).toHaveBeenCalledOnce()
    expect(mockStop).toHaveBeenCalledOnce()
    expect(mockStop).toHaveBeenCalledWith(mockStart.mock.results[0]!.value)
  })

  it('stops caffeinate even when loop reaches max iterations', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Working...'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 2, agentDir: '/tmp/test' }))

    expect(mockStart).toHaveBeenCalledOnce()
    expect(mockStop).toHaveBeenCalledOnce()
  })

  it('stops caffeinate when consumer breaks out of generator early', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['line1', 'line2', 'line3'])
    const task = createMockTask()

    const gen = runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' })
    // Consume only the first event then break
    for await (const event of gen) {
      if ((event as { type: string }).type === 'iteration-start') break
    }

    expect(mockStart).toHaveBeenCalledOnce()
    expect(mockStop).toHaveBeenCalledOnce()
  })

  it('stops caffeinate when loop encounters a blocked tag', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<blocked>No access</blocked>'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }))

    expect(mockStart).toHaveBeenCalledOnce()
    expect(mockStop).toHaveBeenCalledOnce()
  })

  it('generates sessionId and calls saveIteration after each iteration', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Hello', 'World'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 2, agentDir: '/tmp/test' }))

    expect(mockSaveIteration).toHaveBeenCalledTimes(2)
    // First call: iteration 1
    expect(mockSaveIteration).toHaveBeenNthCalledWith(
      1,
      '/tmp/test',
      expect.any(String),
      1,
      'Hello\nWorld\n',
    )
    // Second call: iteration 2, same sessionId
    expect(mockSaveIteration).toHaveBeenNthCalledWith(
      2,
      '/tmp/test',
      expect.any(String),
      2,
      'Hello\nWorld\n',
    )
    // SessionId should be the same across iterations
    const sid1 = mockSaveIteration.mock.calls[0]![1]
    const sid2 = mockSaveIteration.mock.calls[1]![1]
    expect(sid1).toBe(sid2)
  })

  it('calls saveIteration before checking exit tags', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<complete>'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }))

    // saveIteration should still be called even though loop exits on complete
    expect(mockSaveIteration).toHaveBeenCalledOnce()
    expect(mockSaveIteration).toHaveBeenCalledWith(
      '/tmp/test',
      expect.any(String),
      1,
      '<complete>\n',
    )
  })

  it('uses Date.now() as sessionId', async () => {
    const now = 1700000000000
    vi.spyOn(Date, 'now').mockReturnValueOnce(now)
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Done'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }))

    expect(mockSaveIteration).toHaveBeenCalledWith('/tmp/test', now.toString(), 1, 'Done\n')
    vi.restoreAllMocks()
  })

  it('calls appendSessionLog with outcome "complete" on <complete> exit', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<complete>'])
    const task = createMockTask({ id: 42, title: 'My task' })

    await collectEvents(runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }))

    expect(mockAppendSessionLog).toHaveBeenCalledOnce()
    expect(mockAppendSessionLog).toHaveBeenCalledWith(
      '/tmp/test',
      expect.objectContaining({
        taskId: 42,
        taskTitle: 'My task',
        backend: 'mock',
        iterations: 1,
        outcome: 'complete',
      }),
    )
  })

  it('calls appendSessionLog with outcome "blocked" on <blocked> exit', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<blocked>No access</blocked>'])
    const task = createMockTask({ id: 10, title: 'Blocked task' })

    await collectEvents(runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }))

    expect(mockAppendSessionLog).toHaveBeenCalledOnce()
    expect(mockAppendSessionLog).toHaveBeenCalledWith(
      '/tmp/test',
      expect.objectContaining({
        taskId: 10,
        taskTitle: 'Blocked task',
        backend: 'mock',
        iterations: 1,
        outcome: 'blocked',
      }),
    )
  })

  it('calls appendSessionLog with outcome "max-iterations" when max reached', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['Working...'])
    const task = createMockTask({ id: 5, title: 'Long task' })

    await collectEvents(runLoop({ task, backend, maxIterations: 2, agentDir: '/tmp/test' }))

    expect(mockAppendSessionLog).toHaveBeenCalledOnce()
    expect(mockAppendSessionLog).toHaveBeenCalledWith(
      '/tmp/test',
      expect.objectContaining({
        taskId: 5,
        taskTitle: 'Long task',
        backend: 'mock',
        iterations: 2,
        outcome: 'max-iterations',
      }),
    )
  })

  it('session log includes elapsedMs and timestamp', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<complete>'])
    const task = createMockTask()

    await collectEvents(runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }))

    const logArg = mockAppendSessionLog.mock.calls[0]![1]
    expect(typeof logArg.elapsedMs).toBe('number')
    expect(logArg.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(logArg.timestamp).toBeInstanceOf(Date)
  })

  it('calls appendSessionLog with outcome "decide" on <decide> exit', async () => {
    const { runLoop } = await import('./loop-runner.js')
    const backend = createMockBackend(['<decide>REST or GraphQL?</decide>'])
    const task = createMockTask({ id: 7, title: 'API task' })

    await collectEvents(runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' }))

    expect(mockAppendSessionLog).toHaveBeenCalledOnce()
    expect(mockAppendSessionLog).toHaveBeenCalledWith(
      '/tmp/test',
      expect.objectContaining({
        taskId: 7,
        taskTitle: 'API task',
        backend: 'mock',
        iterations: 1,
        outcome: 'decide',
      }),
    )
  })

  describe('signal cleanup (SIGINT/SIGTERM)', () => {
    function createSlowMockChild(): ChildProcess & { finish: () => void } {
      const stdout = new PassThrough()
      const stderr = new PassThrough()
      const stdin = new PassThrough()

      const child = Object.assign(new EventEmitter(), {
        stdout,
        stderr,
        stdin,
        pid: 5678,
        killed: false,
        connected: false,
        exitCode: null as number | null,
        signalCode: null as string | null,
        kill: vi.fn(() => {
          // Simulate kill: close stdout and emit close
          stdout.end()
          setTimeout(() => {
            ;(child as unknown as { exitCode: number }).exitCode = 1
            child.emit('close', 1)
          }, 5)
        }),
        send: vi.fn(),
        disconnect: vi.fn(),
        unref: vi.fn(),
        ref: vi.fn(),
        stdio: [stdin, stdout, stderr, null, null] as ChildProcess['stdio'],
        [Symbol.dispose]: vi.fn(),
      }) as unknown as ChildProcess & { finish: () => void }

      // Write a line but don't end stdout — simulates a long-running process
      process.nextTick(() => {
        stdout.write('Working...\n')
      })

      child.finish = () => {
        stdout.end()
        setTimeout(() => {
          ;(child as unknown as { exitCode: number }).exitCode = 0
          child.emit('close', 0)
        }, 5)
      }

      return child
    }

    it('SIGINT kills the AI child process and stops caffeinate', async () => {
      const { runLoop } = await import('./loop-runner.js')
      const slowChild = createSlowMockChild()
      const backend: AgentBackend = {
        name: 'mock',
        spawn: vi.fn(() => slowChild),
        parseOutput: vi.fn(() => null),
      }
      const task = createMockTask({ id: 99, title: 'Signal task' })

      const gen = runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' })
      const events: unknown[] = []

      // Consume events until we get the first output, then fire SIGINT
      for await (const event of gen) {
        events.push(event)
        if ((event as { type: string }).type === 'output') {
          process.emit('SIGINT', 'SIGINT')
          break
        }
      }

      // Drain remaining events (generator should terminate)
      for await (const event of gen) {
        events.push(event)
      }

      expect(slowChild.kill).toHaveBeenCalledWith('SIGTERM')
      expect(mockStop).toHaveBeenCalledOnce()
    })

    it('SIGTERM kills the AI child process and stops caffeinate', async () => {
      const { runLoop } = await import('./loop-runner.js')
      const slowChild = createSlowMockChild()
      const backend: AgentBackend = {
        name: 'mock',
        spawn: vi.fn(() => slowChild),
        parseOutput: vi.fn(() => null),
      }
      const task = createMockTask({ id: 100, title: 'Term task' })

      const gen = runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' })
      const events: unknown[] = []

      for await (const event of gen) {
        events.push(event)
        if ((event as { type: string }).type === 'output') {
          process.emit('SIGTERM', 'SIGTERM')
          break
        }
      }

      for await (const event of gen) {
        events.push(event)
      }

      expect(slowChild.kill).toHaveBeenCalledWith('SIGTERM')
      expect(mockStop).toHaveBeenCalledOnce()
    })

    it('writes partial session log with error outcome on SIGINT', async () => {
      const { runLoop } = await import('./loop-runner.js')
      const slowChild = createSlowMockChild()
      const backend: AgentBackend = {
        name: 'mock',
        spawn: vi.fn(() => slowChild),
        parseOutput: vi.fn(() => null),
      }
      const task = createMockTask({ id: 101, title: 'Log task' })

      const gen = runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' })

      for await (const event of gen) {
        if ((event as { type: string }).type === 'output') {
          process.emit('SIGINT', 'SIGINT')
          break
        }
      }

      // Drain
      for await (const _event of gen) {
        /* drain */
      }

      expect(mockAppendSessionLog).toHaveBeenCalledOnce()
      expect(mockAppendSessionLog).toHaveBeenCalledWith(
        '/tmp/test',
        expect.objectContaining({
          taskId: 101,
          taskTitle: 'Log task',
          backend: 'mock',
          outcome: 'error',
        }),
      )
    })

    it('does not yield max-reached after SIGINT abort', async () => {
      const { runLoop } = await import('./loop-runner.js')
      const slowChild = createSlowMockChild()
      const backend: AgentBackend = {
        name: 'mock',
        spawn: vi.fn(() => slowChild),
        parseOutput: vi.fn(() => null),
      }
      const task = createMockTask()

      const gen = runLoop({ task, backend, maxIterations: 5, agentDir: '/tmp/test' })
      const events: unknown[] = []

      for await (const event of gen) {
        events.push(event)
        if ((event as { type: string }).type === 'output') {
          process.emit('SIGINT', 'SIGINT')
          break
        }
      }

      for await (const event of gen) {
        events.push(event)
      }

      expect(events).not.toContainEqual({ type: 'max-reached' })
    })

    it('removes signal listeners after loop completes normally', async () => {
      const { runLoop } = await import('./loop-runner.js')
      const backend = createMockBackend(['<complete>'])
      const task = createMockTask()

      const sigintBefore = process.listenerCount('SIGINT')
      const sigtermBefore = process.listenerCount('SIGTERM')

      await collectEvents(runLoop({ task, backend, maxIterations: 1, agentDir: '/tmp/test' }))

      expect(process.listenerCount('SIGINT')).toBe(sigintBefore)
      expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore)
    })
  })
})
