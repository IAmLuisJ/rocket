import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { StatusDashboard } from './StatusDashboard.js'
import type { Task } from '../../lib/tasks/schema.js'

const currentTask: Task = {
  id: 42,
  title: 'Add JWT middleware',
  description: 'desc',
  category: 'api-endpoint',
  passes: false,
  passCondition: 'cond',
}

describe('StatusDashboard', () => {
  it('renders all dashboard sections', () => {
    const { lastFrame } = render(
      <StatusDashboard
        projectName="my-saas"
        stats={{
          overall: { complete: 74, total: 120, percent: 62 },
          byCategory: {
            config: { complete: 10, total: 10, percent: 100 },
            'api-endpoint': { complete: 4, total: 10, percent: 40 },
          },
        }}
        activity={[
          {
            taskId: 40,
            taskTitle: 'Set up Express server',
            backend: 'copilot',
            outcome: 'complete',
            timestamp: new Date('2026-05-17T12:00:00.000Z'),
          },
        ]}
        history={{ sessionCount: 3, totalRuntimeSeconds: 5040 }}
        currentTask={currentTask}
      />,
    )

    const frame = lastFrame()!
    expect(frame).toContain('Rocket Status')
    expect(frame).toContain('my-saas')
    expect(frame).toContain('Overall Progress')
    expect(frame).toContain('74/120 62%')
    expect(frame).toContain('Current Focus Task')
    expect(frame).toContain('#42 · Add JWT middleware')
    expect(frame).toContain('By Category')
    expect(frame).toContain('api-endpoint')
    expect(frame).toContain('Recent Activity')
    expect(frame).toContain('Set up Express server')
    expect(frame).toContain('Loop Sessions: 3')
  })
})
