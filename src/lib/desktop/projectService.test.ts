import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readProjectDashboard, setTaskDetails, setTaskPasses } from './projectService.js'

describe('desktop project service', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-desktop-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  async function writeAgentProject() {
    await mkdir(join(tmpDir, '.agent', 'logs'), { recursive: true })
    await mkdir(join(tmpDir, '.agent', 'history'), { recursive: true })
    await writeFile(
      join(tmpDir, '.agent', 'tasks.json'),
      JSON.stringify({
        tasks: [
          {
            id: 1,
            title: 'Ship CLI',
            description: 'Existing complete task',
            category: 'functional',
            passes: true,
            passCondition: 'CLI works',
          },
          {
            id: 2,
            title: 'Design GUI',
            description: 'Build the desktop UI',
            category: 'ui-ux',
            passes: false,
            passCondition: 'GUI loads tasks',
          },
        ],
      }),
    )
    await writeFile(
      join(tmpDir, '.agent', 'logs', 'LOG.md'),
      [
        '## Session 2026-05-18T04:00:00.000Z',
        '- **Task**: #2 Design GUI',
        '- **Backend**: copilot',
        '- **Iterations**: 1',
        '- **Outcome**: in-progress',
        '- **Elapsed**: 0m 5s',
      ].join('\n'),
    )
  }

  it('returns an empty dashboard for folders without .agent/tasks.json', async () => {
    const dashboard = await readProjectDashboard(tmpDir)

    expect(dashboard.hasAgent).toBe(false)
    expect(dashboard.tasks).toEqual([])
    expect(dashboard.progress.overall).toEqual({ complete: 0, total: 0, percent: 0 })
  })

  it('reads task, progress, activity, and focus data for a Rocket project', async () => {
    await writeAgentProject()

    const dashboard = await readProjectDashboard(tmpDir)

    expect(dashboard.hasAgent).toBe(true)
    expect(dashboard.projectRoot).toBe(tmpDir)
    expect(dashboard.tasks).toHaveLength(2)
    expect(dashboard.progress.overall).toEqual({ complete: 1, total: 2, percent: 50 })
    expect(dashboard.currentTask?.id).toBe(2)
    expect(dashboard.activity[0]).toMatchObject({
      taskId: 2,
      taskTitle: 'Design GUI',
      outcome: 'in-progress',
    })
  })

  it('updates task completion while preserving the tasks file schema', async () => {
    await writeAgentProject()

    const dashboard = await setTaskPasses(tmpDir, 2, true)

    expect(dashboard.progress.overall).toEqual({ complete: 2, total: 2, percent: 100 })
    const updated = JSON.parse(await readFile(join(tmpDir, '.agent', 'tasks.json'), 'utf-8')) as {
      tasks: Array<{ id: number; passes: boolean }>
    }
    expect(updated.tasks.find((task) => task.id === 2)?.passes).toBe(true)
  })

  it('updates editable task details without changing completion state', async () => {
    await writeAgentProject()

    const dashboard = await setTaskDetails(tmpDir, 2, {
      title: 'Design polished desktop GUI',
      description: 'Build the task management surface for Rocket Desktop',
      category: 'ui-ux',
      passCondition: 'Task detail edits persist to .agent/tasks.json',
    })

    const updatedTask = dashboard.tasks.find((task) => task.id === 2)
    expect(updatedTask).toMatchObject({
      id: 2,
      title: 'Design polished desktop GUI',
      description: 'Build the task management surface for Rocket Desktop',
      category: 'ui-ux',
      passes: false,
      passCondition: 'Task detail edits persist to .agent/tasks.json',
    })
  })

  it('rejects invalid task detail updates', async () => {
    await writeAgentProject()

    await expect(
      setTaskDetails(tmpDir, 2, {
        title: '',
        description: 'Missing title should fail validation',
        category: 'ui-ux',
        passCondition: 'Validation rejects the update',
      }),
    ).rejects.toThrow()
  })
})
