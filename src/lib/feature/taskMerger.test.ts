import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { mergeTasks } from './taskMerger.js'

describe('taskMerger', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-merger-'))
    await mkdir(join(tmpDir, '.agent'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('assigns IDs sequentially from max existing ID', async () => {
    await writeFile(
      join(tmpDir, '.agent', 'tasks.json'),
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

    const result = mergeTasks(tmpDir, [
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
    ])

    expect(result.tasksAdded).toBe(2)
    expect(result.newMaxId).toBe(7)

    const updated = JSON.parse(await readFile(join(tmpDir, '.agent', 'tasks.json'), 'utf-8'))
    expect(updated.tasks).toHaveLength(3)
    expect(updated.tasks[1].id).toBe(6)
    expect(updated.tasks[2].id).toBe(7)
  })

  it('starts from ID 1 when tasks list is empty', async () => {
    await writeFile(join(tmpDir, '.agent', 'tasks.json'), JSON.stringify({ tasks: [] }))

    const result = mergeTasks(tmpDir, [
      {
        title: 'First task',
        description: 'desc',
        category: 'config',
        passes: false,
        passCondition: 'cond',
      },
    ])

    expect(result.tasksAdded).toBe(1)
    expect(result.newMaxId).toBe(1)
  })

  it('throws on invalid category', async () => {
    await writeFile(join(tmpDir, '.agent', 'tasks.json'), JSON.stringify({ tasks: [] }))

    expect(() =>
      mergeTasks(tmpDir, [
        {
          title: 'Bad task',
          description: 'desc',
          category: 'invalid-category',
          passes: false,
          passCondition: 'cond',
        },
      ]),
    ).toThrow()
  })
})
