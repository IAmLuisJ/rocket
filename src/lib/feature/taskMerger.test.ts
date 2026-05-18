import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { mergeTasks, type NewTask } from './taskMerger.js'
import type { Task } from '../tasks/schema.js'

describe('taskMerger', () => {
  let tmpDir: string
  let tasksPath: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-merger-'))
    await mkdir(join(tmpDir, '.agent'), { recursive: true })
    tasksPath = join(tmpDir, '.agent', 'tasks.json')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('assigns IDs sequentially from max existing ID', async () => {
    await writeFile(
      tasksPath,
      JSON.stringify({
        tasks: [
          {
            id: 5,
            title: 'Existing task',
            description: 'desc',
            category: 'functional',
            passes: true,
            passCondition: 'cond',
          },
        ],
      }),
    )

    const result = await mergeTasks(
      [
        {
          title: 'New task 1',
          description: 'desc1',
          category: 'functional',
          passes: false,
          passCondition: 'cond1',
        },
        {
          title: 'New task 2',
          description: 'desc2',
          category: 'testing',
          passes: false,
          passCondition: 'cond2',
        },
      ],
      tasksPath,
    )

    expect(result).toEqual({ added: 2, newMaxId: 7 })

    const updated = JSON.parse(await readFile(tasksPath, 'utf-8')) as { tasks: Task[] }
    expect(updated.tasks).toHaveLength(3)
    expect(updated.tasks[0]).toEqual({
      id: 5,
      title: 'Existing task',
      description: 'desc',
      category: 'functional',
      passes: true,
      passCondition: 'cond',
    })
    expect(updated.tasks[1].id).toBe(6)
    expect(updated.tasks[2].id).toBe(7)
  })

  it('starts from ID 1 when tasks list is empty', async () => {
    await writeFile(tasksPath, JSON.stringify({ tasks: [] }))

    const result = await mergeTasks(
      [
        {
          title: 'First task',
          description: 'desc',
          category: 'config',
          passes: false,
          passCondition: 'cond',
        },
      ],
      tasksPath,
    )

    expect(result).toEqual({ added: 1, newMaxId: 1 })
  })

  it('adds nothing for empty new task lists', async () => {
    const original = {
      tasks: [
        {
          id: 3,
          title: 'Existing task',
          description: 'desc',
          category: 'docs',
          passes: false,
          passCondition: 'cond',
        },
      ],
    }
    await writeFile(tasksPath, JSON.stringify(original))

    const result = await mergeTasks([], tasksPath)

    expect(result).toEqual({ added: 0, newMaxId: 3 })
    expect(JSON.parse(await readFile(tasksPath, 'utf-8'))).toEqual(original)
  })

  it('throws on invalid category', async () => {
    await writeFile(tasksPath, JSON.stringify({ tasks: [] }))

    await expect(
      mergeTasks(
        [
          {
            title: 'Bad task',
            description: 'desc',
            category: 'invalid-category',
            passes: false,
            passCondition: 'cond',
          } as unknown as NewTask,
        ],
        tasksPath,
      ),
    ).rejects.toThrow()
  })

  it('validates all new tasks before writing', async () => {
    const original = {
      tasks: [
        {
          id: 8,
          title: 'Existing task',
          description: 'desc',
          category: 'functional',
          passes: false,
          passCondition: 'cond',
        },
      ],
    }
    await writeFile(tasksPath, JSON.stringify(original))

    await expect(
      mergeTasks(
        [
          {
            title: 'Valid task',
            description: 'desc',
            category: 'functional',
            passes: false,
            passCondition: 'cond',
          },
          {
            title: '',
            description: 'desc',
            category: 'testing',
            passes: false,
            passCondition: 'cond',
          },
        ],
        tasksPath,
      ),
    ).rejects.toThrow()

    expect(JSON.parse(await readFile(tasksPath, 'utf-8'))).toEqual(original)
  })
})
