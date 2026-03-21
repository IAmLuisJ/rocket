import { describe, it, expect } from 'vitest'
import { calculateProgress } from './calculator.js'
import type { Task } from '../tasks/schema.js'

function makeTask(overrides: Partial<Task> & { id: number; category: Task['category'] }): Task {
  return {
    title: `Task ${overrides.id}`,
    description: 'desc',
    passes: false,
    passCondition: 'cond',
    ...overrides,
  }
}

describe('calculateProgress', () => {
  it('returns zero stats for empty task list', () => {
    const result = calculateProgress([])
    expect(result.overall).toEqual({ complete: 0, total: 0, percent: 0 })
    expect(result.byCategory).toEqual({})
  })

  it('computes overall progress correctly', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, category: 'functional', passes: true }),
      makeTask({ id: 2, category: 'functional', passes: false }),
      makeTask({ id: 3, category: 'testing', passes: true }),
      makeTask({ id: 4, category: 'testing', passes: true }),
    ]

    const result = calculateProgress(tasks)
    expect(result.overall.complete).toBe(3)
    expect(result.overall.total).toBe(4)
    expect(result.overall.percent).toBe(75)
  })

  it('computes per-category stats', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, category: 'functional', passes: true }),
      makeTask({ id: 2, category: 'functional', passes: false }),
      makeTask({ id: 3, category: 'testing', passes: true }),
    ]

    const result = calculateProgress(tasks)
    expect(result.byCategory['functional']).toEqual({ complete: 1, total: 2, percent: 50 })
    expect(result.byCategory['testing']).toEqual({ complete: 1, total: 1, percent: 100 })
  })

  it('handles all complete', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, category: 'config', passes: true }),
      makeTask({ id: 2, category: 'config', passes: true }),
    ]

    const result = calculateProgress(tasks)
    expect(result.overall.percent).toBe(100)
  })

  it('handles none complete', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, category: 'docs', passes: false }),
      makeTask({ id: 2, category: 'docs', passes: false }),
    ]

    const result = calculateProgress(tasks)
    expect(result.overall.percent).toBe(0)
  })
})
