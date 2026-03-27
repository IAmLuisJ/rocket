import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { TasksApp } from './TasksApp.js'
import type { Task } from '../../lib/tasks/schema.js'

const delay = (ms = 50) => new Promise((r) => setTimeout(r, ms))

function makeTasks(): Task[] {
  return [
    {
      id: 1,
      title: 'Setup project',
      description: 'Initialize the project structure',
      category: 'config',
      passes: true,
      passCondition: 'project builds',
    },
    {
      id: 2,
      title: 'Build login',
      description: 'Implement login flow',
      category: 'functional',
      passes: false,
      passCondition: 'login works',
    },
    {
      id: 3,
      title: 'Add styling',
      description: 'Style the components',
      category: 'ui-ux',
      passes: false,
      passCondition: 'styles applied',
      blockedReason: 'Waiting on design specs',
    },
  ]
}

describe('TasksApp', () => {
  it('renders task list with status icons', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} />)
    const frame = lastFrame()!
    expect(frame).toContain('✓')
    expect(frame).toContain('[#1]')
    expect(frame).toContain('Setup project')
    expect(frame).toContain('○')
    expect(frame).toContain('[#2]')
    expect(frame).toContain('Build login')
  })

  it('shows ✓ for complete tasks and ○ for incomplete', () => {
    const tasks: Task[] = [
      {
        id: 10,
        title: 'Done task',
        description: 'd',
        category: 'config',
        passes: true,
        passCondition: 'ok',
      },
      {
        id: 11,
        title: 'Pending task',
        description: 'd',
        category: 'config',
        passes: false,
        passCondition: 'ok',
      },
    ]
    const { lastFrame } = render(<TasksApp tasks={tasks} />)
    const frame = lastFrame()!
    expect(frame).toContain('✓')
    expect(frame).toContain('○')
    expect(frame).toContain('[#10]')
    expect(frame).toContain('[#11]')
  })

  it('displays header with filter info and task count', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} />)
    const frame = lastFrame()!
    expect(frame).toContain('Rocket Tasks')
    expect(frame).toContain('Filter: all')
    expect(frame).toContain('3/3')
  })

  it('shows keyboard shortcut hints', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} />)
    const frame = lastFrame()!
    expect(frame).toContain('[f] toggle filter')
    expect(frame).toContain('[q] quit')
  })

  it('cycles filter on f keypress', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    expect(lastFrame()).toContain('Filter: all')
    expect(lastFrame()).toContain('3/3')

    stdin.write('f')
    await delay(100)
    expect(lastFrame()).toContain('Filter: incomplete')
    expect(lastFrame()).toContain('2/3')

    stdin.write('f')
    await delay(100)
    expect(lastFrame()).toContain('Filter: complete')
    expect(lastFrame()).toContain('1/3')

    stdin.write('f')
    await delay(100)
    expect(lastFrame()).toContain('Filter: blocked')
    expect(lastFrame()).toContain('1/3')

    stdin.write('f')
    await delay(100)
    expect(lastFrame()).toContain('Filter: all')
  })

  it('accepts initialFilter prop', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} initialFilter="incomplete" />)
    const frame = lastFrame()!
    expect(frame).toContain('Filter: incomplete')
    expect(frame).toContain('2/3')
  })

  it('shows task detail when a task is selected via enter', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    const frame = lastFrame()!
    expect(frame).toContain('Task #1')
    expect(frame).toContain('Setup project')
    expect(frame).toContain('Initialize the project structure')
    expect(frame).toContain('Category:')
    expect(frame).toContain('config')
    expect(frame).toContain('Status:')
    expect(frame).toContain('Complete')
  })

  it('returns to list on b keypress from detail view', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    expect(lastFrame()).toContain('Task #1')
    stdin.write('b')
    await delay()
    expect(lastFrame()).toContain('Rocket Tasks')
    expect(lastFrame()).toContain('Filter: all')
  })

  it('calls onMarkComplete when m is pressed on incomplete task', async () => {
    const onMark = vi.fn()
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} onMarkComplete={onMark} />)
    await delay()
    stdin.write('\x1B[B') // arrow down
    await delay()
    stdin.write('\r') // select
    await delay()
    expect(lastFrame()).toContain('Task #2')
    expect(lastFrame()).toContain('Incomplete')
    stdin.write('m')
    await delay()
    expect(onMark).toHaveBeenCalledWith(2)
    expect(lastFrame()).toContain('Complete')
  })

  it('shows blocked reason in detail view', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\x1B[B') // down
    await delay()
    stdin.write('\x1B[B') // down
    await delay()
    stdin.write('\r') // select
    await delay()
    expect(lastFrame()).toContain('Task #3')
    expect(lastFrame()).toContain('Blocked:')
    expect(lastFrame()).toContain('Waiting on design specs')
  })

  it('shows detail shortcuts including back and mark', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    const frame = lastFrame()!
    expect(frame).toContain('[b] back')
    expect(frame).toContain('[m] mark complete')
    expect(frame).toContain('[q] quit')
  })
})
