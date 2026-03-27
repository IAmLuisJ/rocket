import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { RocketLoopApp } from './RocketLoopApp.js'
import type { Task } from '../lib/tasks/schema.js'
import type { AgentBackend } from '../lib/backends/types.js'

// Mock useApp so BlockedScreen/DecideScreen don't try to exit the real app
const mockExit = vi.fn()
vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink')
  return {
    ...actual,
    useApp: () => ({ exit: mockExit }),
  }
})

// Mock the loop runner hook so we don't actually run the loop
vi.mock('./hooks/useLoopRunner.js', () => ({
  useLoopRunner: () => ({
    state: {
      phase: 'idle',
      currentIteration: 0,
      outputLines: [],
      iterations: 0,
      totalMs: 0,
      iterationStats: [],
    },
    start: vi.fn(),
    stop: vi.fn(),
  }),
}))

function makeTasks(): Task[] {
  return [
    {
      id: 10,
      title: 'Setup config',
      description: 'desc',
      category: 'config',
      passes: false,
      passCondition: 'config works',
    },
    {
      id: 11,
      title: 'Build feature',
      description: 'desc',
      category: 'functional',
      passes: false,
      passCondition: 'feature works',
    },
    {
      id: 12,
      title: 'Done task',
      description: 'desc',
      category: 'functional',
      passes: true,
      passCondition: 'done',
    },
  ]
}

function makeBackend(): AgentBackend {
  return { name: 'copilot', spawn: vi.fn(), parseOutput: vi.fn() }
}

const defaultProps = {
  tasks: makeTasks(),
  backend: makeBackend(),
  backendName: 'copilot',
  projectName: 'test-project',
  maxIterations: 5,
  agentDir: '/tmp/agent',
}

describe('RocketLoopApp', () => {
  it('starts in selecting state showing TaskSelector', () => {
    const { lastFrame } = render(<RocketLoopApp {...defaultProps} />)
    const frame = lastFrame()
    expect(frame).toContain('Select task to focus on:')
    expect(frame).toContain('test-project')
    expect(frame).toContain('copilot')
  })

  it('shows incomplete tasks in TaskSelector', () => {
    const { lastFrame } = render(<RocketLoopApp {...defaultProps} />)
    const frame = lastFrame()
    expect(frame).toContain('[#10] Setup config')
    expect(frame).toContain('[#11] Build feature')
    expect(frame).not.toContain('[#12] Done task')
  })

  it('shows Auto option in selecting state', () => {
    const { lastFrame } = render(<RocketLoopApp {...defaultProps} />)
    expect(lastFrame()).toContain('Auto')
  })

  it('exports AppState type and default export', async () => {
    const mod = await import('./RocketLoopApp.js')
    expect(mod.RocketLoopApp).toBeDefined()
    expect(mod.default).toBe(mod.RocketLoopApp)
  })

  it('renders with all tasks complete', () => {
    const allDone: Task[] = [
      {
        id: 1,
        title: 'Only task',
        description: 'desc',
        category: 'functional',
        passes: true,
        passCondition: 'done',
      },
    ]
    const { lastFrame } = render(<RocketLoopApp {...defaultProps} tasks={allDone} />)
    const frame = lastFrame()
    expect(frame).toContain('Select task to focus on:')
    expect(frame).toContain('0')
  })
})
