import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { TaskSchema, TasksFileSchema } from './schema.js'
import type { Task, TasksFile } from './schema.js'

describe('TaskSchema', () => {
  const validTask = {
    id: 1,
    title: 'Test task',
    description: 'A test task',
    category: 'functional',
    passes: false,
    passCondition: 'It works',
  }

  it('accepts a valid task', () => {
    const result = TaskSchema.parse(validTask)
    expect(result.id).toBe(1)
    expect(result.title).toBe('Test task')
    expect(result.passes).toBe(false)
  })

  it('accepts a task with optional blockedReason', () => {
    const result = TaskSchema.parse({ ...validTask, blockedReason: 'Waiting on API' })
    expect(result.blockedReason).toBe('Waiting on API')
  })

  it('accepts a task with optional specFilePath', () => {
    const result = TaskSchema.parse({ ...validTask, specFilePath: '.agent/tasks/TASK-1.json' })
    expect(result.specFilePath).toBe('.agent/tasks/TASK-1.json')
  })

  it('throws ZodError when title is missing', () => {
    const { title, ...noTitle } = validTask
    expect(() => TaskSchema.parse(noTitle)).toThrow(ZodError)
  })

  it('throws ZodError when description is missing', () => {
    const { description, ...noDesc } = validTask
    expect(() => TaskSchema.parse(noDesc)).toThrow(ZodError)
  })

  it('throws ZodError when id is not a positive integer', () => {
    expect(() => TaskSchema.parse({ ...validTask, id: -1 })).toThrow(ZodError)
    expect(() => TaskSchema.parse({ ...validTask, id: 0 })).toThrow(ZodError)
    expect(() => TaskSchema.parse({ ...validTask, id: 1.5 })).toThrow(ZodError)
  })

  it('throws ZodError when title is empty string', () => {
    expect(() => TaskSchema.parse({ ...validTask, title: '' })).toThrow(ZodError)
  })

  it('throws ZodError when category is invalid', () => {
    expect(() => TaskSchema.parse({ ...validTask, category: 'invalid' })).toThrow(ZodError)
  })

  it('validates all category values', () => {
    const categories = [
      'config', 'functional', 'ui-ux', 'data-model',
      'api-endpoint', 'integration', 'security', 'testing', 'docs',
    ]
    for (const category of categories) {
      expect(() => TaskSchema.parse({ ...validTask, category })).not.toThrow()
    }
  })
})

describe('TasksFileSchema', () => {
  it('accepts a valid tasks file', () => {
    const file = {
      tasks: [
        {
          id: 1,
          title: 'Task one',
          description: 'First task',
          category: 'config',
          passes: true,
          passCondition: 'Config exists',
        },
      ],
    }
    const result = TasksFileSchema.parse(file)
    expect(result.tasks).toHaveLength(1)
  })

  it('accepts empty tasks array', () => {
    const result = TasksFileSchema.parse({ tasks: [] })
    expect(result.tasks).toHaveLength(0)
  })

  it('throws ZodError when tasks key is missing', () => {
    expect(() => TasksFileSchema.parse({})).toThrow(ZodError)
  })
})

describe('type exports', () => {
  it('Task type is compatible with parsed output', () => {
    const task: Task = TaskSchema.parse({
      id: 1,
      title: 'Typed',
      description: 'A typed task',
      category: 'functional',
      passes: false,
      passCondition: 'Types work',
    })
    expect(task.id).toBe(1)
  })

  it('TasksFile type is compatible with parsed output', () => {
    const file: TasksFile = TasksFileSchema.parse({
      tasks: [],
    })
    expect(file.tasks).toEqual([])
  })
})
