import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  readTasks,
  writeTasks,
  getIncompleteTasks,
  getMaxTaskId,
  markTaskComplete,
} from './reader.js'

describe('task reader', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-test-'))
    await mkdir(join(tmpDir, '.agent'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('readTasks reads valid tasks.json', async () => {
    const data = {
      tasks: [
        {
          id: 1,
          title: 'Test task',
          description: 'A test',
          category: 'functional',
          passes: false,
          passCondition: 'It works',
        },
      ],
    }
    await writeFile(join(tmpDir, '.agent', 'tasks.json'), JSON.stringify(data))
    const result = await readTasks(tmpDir)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]!.title).toBe('Test task')
  })

  it('writeTasks persists tasks', async () => {
    const data = {
      tasks: [
        {
          id: 1,
          title: 'Written task',
          description: 'Test',
          category: 'functional' as const,
          passes: true,
          passCondition: 'Pass',
        },
      ],
    }
    await writeTasks(tmpDir, data)
    const result = await readTasks(tmpDir)
    expect(result.tasks[0]!.passes).toBe(true)
  })

  it('getIncompleteTasks filters by passes:false', () => {
    const tasks = [
      {
        id: 1,
        title: 'Done',
        description: 'A done task',
        category: 'functional' as const,
        passes: true,
        passCondition: 'It passes',
      },
      {
        id: 2,
        title: 'Todo',
        description: 'A todo task',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It passes',
      },
    ]
    const incomplete = getIncompleteTasks(tasks)
    expect(incomplete).toHaveLength(1)
    expect(incomplete[0]!.id).toBe(2)
  })

  it('getMaxTaskId returns highest id', () => {
    const tasks = [
      {
        id: 3,
        title: 'A',
        description: 'Task A',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It works',
      },
      {
        id: 7,
        title: 'B',
        description: 'Task B',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It works',
      },
    ]
    expect(getMaxTaskId(tasks)).toBe(7)
  })

  it('getMaxTaskId returns 0 for empty array', () => {
    expect(getMaxTaskId([])).toBe(0)
  })

  it('markTaskComplete sets passes to true for matching id', () => {
    const tasks = [
      {
        id: 1,
        title: 'Task A',
        description: 'First',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It works',
      },
      {
        id: 2,
        title: 'Task B',
        description: 'Second',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It works',
      },
    ]
    const updated = markTaskComplete(tasks, 1)
    expect(updated[0]!.passes).toBe(true)
    expect(updated[1]!.passes).toBe(false)
    // original array is not mutated
    expect(tasks[0]!.passes).toBe(false)
  })

  it('markTaskComplete leaves all tasks unchanged if id not found', () => {
    const tasks = [
      {
        id: 1,
        title: 'Task A',
        description: 'First',
        category: 'functional' as const,
        passes: false,
        passCondition: 'It works',
      },
    ]
    const updated = markTaskComplete(tasks, 99)
    expect(updated[0]!.passes).toBe(false)
  })

  it('readTasks throws descriptive error if tasks.json is missing', () => {
    expect(() => readTasks(tmpDir)).toThrow(/tasks\.json/)
  })

  it('readTasks throws on invalid tasks.json', async () => {
    await writeFile(join(tmpDir, '.agent', 'tasks.json'), '{"tasks": [{"bad": true}]}')
    expect(() => readTasks(tmpDir)).toThrow()
  })
})
