import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { TaskSelector } from './TaskSelector.js'
import type { Task } from '../../lib/tasks/schema.js'

function makeTasks(overrides: Partial<Task>[] = []): Task[] {
  const defaults: Task[] = [
    {
      id: 1,
      title: 'First task',
      description: 'desc',
      category: 'functional',
      passes: false,
      passCondition: 'test passes',
    },
    {
      id: 2,
      title: 'Second task',
      description: 'desc',
      category: 'ui-ux',
      passes: true,
      passCondition: 'test passes',
    },
    {
      id: 3,
      title: 'Third task',
      description: 'desc',
      category: 'config',
      passes: false,
      passCondition: 'test passes',
    },
  ]
  return overrides.length > 0
    ? overrides.map((o, i) => ({ ...defaults[i % defaults.length]!, ...o }))
    : defaults
}

describe('TaskSelector', () => {
  it('renders task list with incomplete tasks only', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    const frame = lastFrame()
    expect(frame).toContain('[#1] First task')
    expect(frame).toContain('[#3] Third task')
    // Task 2 passes=true, should not appear
    expect(frame).not.toContain('[#2] Second task')
  })

  it('shows Auto option first', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    const frame = lastFrame()!
    const autoIdx = frame.indexOf('Auto')
    const task1Idx = frame.indexOf('[#1]')
    expect(autoIdx).toBeGreaterThan(-1)
    expect(task1Idx).toBeGreaterThan(-1)
    expect(autoIdx).toBeLessThan(task1Idx)
  })

  it('displays "Select task to focus on:" heading', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    expect(lastFrame()).toContain('Select task to focus on:')
  })

  it('shows project name and backend name', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector
        tasks={tasks}
        backendName="claude"
        projectName="test-proj"
        onSelect={() => {}}
      />,
    )
    const frame = lastFrame()
    expect(frame).toContain('test-proj')
    expect(frame).toContain('claude')
  })

  it('shows incomplete task count', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    // 2 incomplete tasks
    expect(lastFrame()).toContain('2')
  })

  it('formats each task as [#id] title', () => {
    const tasks: Task[] = [
      {
        id: 42,
        title: 'Implement auth',
        description: 'desc',
        category: 'security',
        passes: false,
        passCondition: 'test passes',
      },
    ]
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    expect(lastFrame()).toContain('[#42] Implement auth')
  })

  it('contains Auto — pick next incomplete label', () => {
    const tasks = makeTasks()
    const { lastFrame } = render(
      <TaskSelector tasks={tasks} backendName="copilot" projectName="my-app" onSelect={() => {}} />,
    )
    expect(lastFrame()).toContain('Auto — pick next incomplete')
  })
})
