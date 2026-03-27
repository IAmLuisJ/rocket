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
    expect(frame).toContain('[m] mark complete')
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

  it('shows empty detail panel placeholder before selection', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} />)
    const frame = lastFrame()!
    expect(frame).toContain('Select a task to view details')
  })

  it('shows task detail panel when a task is selected via enter', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    const frame = lastFrame()!
    // Detail panel shows task info
    expect(frame).toContain('#1 Setup project')
    expect(frame).toContain('Initialize the project structure')
    expect(frame).toContain('Pass condition: project builds')
    expect(frame).toContain('Category:')
    expect(frame).toContain('config')
    expect(frame).toContain('Status:')
    expect(frame).toContain('Complete')
    // Task list is still visible (side-by-side layout)
    expect(frame).toContain('Rocket Tasks')
  })

  it('clears detail panel on b keypress', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    expect(lastFrame()).toContain('#1 Setup project')
    stdin.write('b')
    await delay()
    expect(lastFrame()).toContain('Select a task to view details')
    expect(lastFrame()).toContain('Rocket Tasks')
  })

  it('calls onMarkComplete when m is pressed on incomplete task', async () => {
    const onMark = vi.fn()
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} onMarkComplete={onMark} />)
    await delay()
    stdin.write('\x1B[B') // arrow down
    await delay()
    stdin.write('\r') // select
    await delay()
    expect(lastFrame()).toContain('#2 Build login')
    expect(lastFrame()).toContain('Incomplete')
    stdin.write('m')
    await delay()
    expect(onMark).toHaveBeenCalledWith(2)
    expect(lastFrame()).toContain('Complete')
  })

  it('shows flash message after marking task complete', async () => {
    const onMark = vi.fn()
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} onMarkComplete={onMark} />)
    await delay()
    stdin.write('\x1B[B') // arrow down
    await delay()
    stdin.write('\r') // select task #2
    await delay()
    stdin.write('m')
    await delay()
    expect(lastFrame()).toContain('Task #2 marked complete')
  })

  it('updates task list icon after marking complete', async () => {
    const onMark = vi.fn()
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} onMarkComplete={onMark} />)
    await delay()
    // Initially task #2 shows ○
    expect(lastFrame()).toContain('○')
    expect(lastFrame()).toContain('[#2]')
    stdin.write('\x1B[B') // arrow down to task #2
    await delay()
    stdin.write('\r') // select
    await delay()
    stdin.write('m') // mark complete
    await delay()
    // Task #2 should now show ✓ in the list
    const frame = lastFrame()!
    // Both task 1 and task 2 should be ✓ now
    const checkmarks = frame.match(/✓/g) || []
    expect(checkmarks.length).toBeGreaterThanOrEqual(2)
  })

  it('does not fire onMarkComplete on already-complete task', async () => {
    const onMark = vi.fn()
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} onMarkComplete={onMark} />)
    await delay()
    stdin.write('\r') // select task #1 (already complete)
    await delay()
    expect(lastFrame()).toContain('#1 Setup project')
    expect(lastFrame()).toContain('Complete')
    stdin.write('m')
    await delay()
    expect(onMark).not.toHaveBeenCalled()
  })

  it('shows blocked reason in detail panel', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\x1B[B') // down
    await delay()
    stdin.write('\x1B[B') // down
    await delay()
    stdin.write('\r') // select
    await delay()
    expect(lastFrame()).toContain('#3 Add styling')
    expect(lastFrame()).toContain('Blocked:')
    expect(lastFrame()).toContain('Waiting on design specs')
  })

  it('detail panel uses Box border for visual separation', async () => {
    const { lastFrame, stdin } = render(<TasksApp tasks={makeTasks()} />)
    await delay()
    stdin.write('\r')
    await delay()
    const frame = lastFrame()!
    // Round border uses ╭ ╮ ╰ ╯ characters
    expect(frame).toMatch(/[╭╮╰╯]/)
  })

  it('shows detail panel with border even when no task selected', () => {
    const { lastFrame } = render(<TasksApp tasks={makeTasks()} />)
    const frame = lastFrame()!
    // Round border characters present for the empty detail panel
    expect(frame).toMatch(/[╭╮╰╯]/)
  })
})
