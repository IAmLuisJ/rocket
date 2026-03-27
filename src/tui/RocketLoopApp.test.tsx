import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
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

const mockStart = vi.fn()
const mockStop = vi.fn()
const mockTogglePause = vi.fn()
const mockSkip = vi.fn()
let mockPaused = false
let mockLoopState = {
  phase: 'idle' as string,
  currentIteration: 0,
  outputLines: [] as string[],
  iterations: 0,
  totalMs: 0,
  iterationStats: [],
}

// Mock the loop runner hook so we don't actually run the loop
vi.mock('./hooks/useLoopRunner.js', () => ({
  useLoopRunner: () => ({
    state: mockLoopState,
    start: mockStart,
    stop: mockStop,
    togglePause: mockTogglePause,
    skip: mockSkip,
    paused: mockPaused,
  }),
}))

let capturedOnSelect: ((task: Task | null) => void) | null = null
vi.mock('./components/TaskSelector.js', () => ({
  TaskSelector: ({ onSelect }: { onSelect: (task: Task | null) => void }) => {
    capturedOnSelect = onSelect
    return React.createElement('ink-text', null, 'TaskSelector')
  },
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

beforeEach(() => {
  vi.clearAllMocks()
  mockPaused = false
  capturedOnSelect = null
  mockLoopState = {
    phase: 'idle',
    currentIteration: 0,
    outputLines: [],
    iterations: 0,
    totalMs: 0,
    iterationStats: [],
  }
})

describe('RocketLoopApp', () => {
  it('starts in selecting state showing TaskSelector', () => {
    const { lastFrame } = render(<RocketLoopApp {...defaultProps} />)
    expect(lastFrame()).toContain('TaskSelector')
  })

  it('exports AppState type and default export', async () => {
    const mod = await import('./RocketLoopApp.js')
    expect(mod.RocketLoopApp).toBeDefined()
    expect(mod.default).toBe(mod.RocketLoopApp)
  })
})

describe('RocketLoopApp keyboard shortcuts - selecting state', () => {
  it('does not call stop/exit when q is pressed in selecting state', () => {
    const { stdin } = render(<RocketLoopApp {...defaultProps} />)
    stdin.write('q')
    expect(mockStop).not.toHaveBeenCalled()
    expect(mockExit).not.toHaveBeenCalled()
  })

  it('does not call togglePause when p is pressed in selecting state', () => {
    const { stdin } = render(<RocketLoopApp {...defaultProps} />)
    stdin.write('p')
    expect(mockTogglePause).not.toHaveBeenCalled()
  })

  it('does not call skip when s is pressed in selecting state', () => {
    const { stdin } = render(<RocketLoopApp {...defaultProps} />)
    stdin.write('s')
    expect(mockSkip).not.toHaveBeenCalled()
  })
})

describe('RocketLoopApp keyboard shortcuts - running state', () => {
  function renderInRunningState() {
    mockLoopState = {
      phase: 'running',
      currentIteration: 1,
      outputLines: ['building...'],
      iterations: 0,
      totalMs: 0,
      iterationStats: [],
    }
    const result = render(<RocketLoopApp {...defaultProps} />)
    // Trigger task selection to move from 'selecting' to 'running'
    capturedOnSelect!(makeTasks()[0])
    return result
  }

  it('calls stop and exit when q is pressed during running phase', async () => {
    const { stdin } = renderInRunningState()
    await new Promise((r) => setTimeout(r, 50))
    stdin.write('q')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockStop).toHaveBeenCalled()
    expect(mockExit).toHaveBeenCalled()
  })

  it('calls togglePause when p is pressed during running phase', async () => {
    const { stdin } = renderInRunningState()
    await new Promise((r) => setTimeout(r, 50))
    stdin.write('p')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockTogglePause).toHaveBeenCalled()
  })

  it('calls skip when s is pressed during running phase', async () => {
    const { stdin } = renderInRunningState()
    await new Promise((r) => setTimeout(r, 50))
    stdin.write('s')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockSkip).toHaveBeenCalled()
  })

  it('shows shortcut hints in running state', () => {
    const { lastFrame } = renderInRunningState()
    const frame = lastFrame()
    expect(frame).toContain('q quit')
    expect(frame).toContain('p pause')
    expect(frame).toContain('s skip')
  })

  it('shows paused indicator when paused is true', () => {
    mockPaused = true
    const { lastFrame } = renderInRunningState()
    const frame = lastFrame()
    expect(frame).toContain('Paused')
    expect(frame).toContain('press p to resume')
  })

  it('does not show paused indicator when not paused', () => {
    const { lastFrame } = renderInRunningState()
    expect(lastFrame()).not.toContain('Paused')
  })
})
