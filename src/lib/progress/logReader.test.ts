import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { getCurrentTask, readRecentActivity } from './logReader.js'
import type { Task } from '../tasks/schema.js'

describe('logReader', () => {
  let tmpDir: string
  let agentDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-log-'))
    agentDir = join(tmpDir, '.agent')
    await mkdir(join(agentDir, 'logs'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns recent activity entries from LOG.md', async () => {
    await writeFile(
      join(agentDir, 'logs', 'LOG.md'),
      [
        '## Session 2026-05-17T10:00:00.000Z',
        '- **Task**: #12 Build API',
        '- **Backend**: copilot',
        '- **Iterations**: 2',
        '- **Outcome**: complete',
        '- **Elapsed**: 1m 5s',
        '',
        '## Session 2026-05-17T11:00:00.000Z',
        '- **Task**: #13 Build UI',
        '- **Backend**: claude',
        '- **Iterations**: 1',
        '- **Outcome**: in-progress',
        '- **Elapsed**: 0m 30s',
      ].join('\n'),
    )

    const entries = await readRecentActivity(agentDir, 2)

    expect(entries).toMatchObject([
      {
        taskId: 12,
        taskTitle: 'Build API',
        backend: 'copilot',
        outcome: 'complete',
      },
      {
        taskId: 13,
        taskTitle: 'Build UI',
        backend: 'claude',
        outcome: 'in-progress',
      },
    ])
    expect(entries[0].timestamp).toEqual(new Date('2026-05-17T10:00:00.000Z'))
  })

  it('returns [] when LOG.md does not exist', async () => {
    await rm(join(agentDir, 'logs', 'LOG.md'), { force: true })

    await expect(readRecentActivity(agentDir, 5)).resolves.toEqual([])
  })

  it('cross-references the last in-progress log entry to the task list', async () => {
    await writeFile(
      join(agentDir, 'logs', 'LOG.md'),
      [
        '## Session 2026-05-17T10:00:00.000Z',
        '- **Task**: #7 Old work',
        '- **Backend**: copilot',
        '- **Iterations**: 1',
        '- **Outcome**: complete',
        '- **Elapsed**: 0m 4s',
        '',
        '## Session 2026-05-17T11:00:00.000Z',
        '- **Task**: #8 Active work',
        '- **Backend**: copilot',
        '- **Iterations**: 1',
        '- **Outcome**: in-progress',
        '- **Elapsed**: 0m 5s',
      ].join('\n'),
    )
    const tasks: Task[] = [
      {
        id: 8,
        title: 'Active work',
        description: 'desc',
        category: 'functional',
        passes: false,
        passCondition: 'cond',
      },
    ]

    await expect(getCurrentTask(agentDir, tasks)).resolves.toEqual(tasks[0])
  })
})
