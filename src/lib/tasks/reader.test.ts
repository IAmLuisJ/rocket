import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readTasks, writeTasks, getIncompleteTasks, getMaxTaskId } from './reader.js'

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
        description: '',
        category: 'functional' as const,
        passes: true,
        passCondition: '',
      },
      {
        id: 2,
        title: 'Todo',
        description: '',
        category: 'functional' as const,
        passes: false,
        passCondition: '',
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
        description: '',
        category: 'functional' as const,
        passes: false,
        passCondition: '',
      },
      {
        id: 7,
        title: 'B',
        description: '',
        category: 'functional' as const,
        passes: false,
        passCondition: '',
      },
    ]
    expect(getMaxTaskId(tasks)).toBe(7)
  })

  it('getMaxTaskId returns 0 for empty array', () => {
    expect(getMaxTaskId([])).toBe(0)
  })
})
