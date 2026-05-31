import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readRecentProjects, rememberRecentProject } from './recentProjects.js'

describe('desktop recent projects', () => {
  let tmpDir: string
  let storePath: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-recent-'))
    storePath = join(tmpDir, 'recent-projects.json')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns an empty list when no recent projects file exists', async () => {
    await expect(readRecentProjects(storePath)).resolves.toEqual([])
  })

  it('stores newest projects first', async () => {
    await rememberRecentProject(storePath, project('/tmp/one', 'one'))
    await rememberRecentProject(storePath, project('/tmp/two', 'two'))

    const recent = await readRecentProjects(storePath)

    expect(recent.map((item) => item.projectRoot)).toEqual(['/tmp/two', '/tmp/one'])
  })

  it('moves an existing project to the top without duplicating it', async () => {
    await rememberRecentProject(storePath, project('/tmp/one', 'one'))
    await rememberRecentProject(storePath, project('/tmp/two', 'two'))
    await rememberRecentProject(storePath, project('/tmp/one', 'one-renamed'))

    const recent = await readRecentProjects(storePath)

    expect(recent).toHaveLength(2)
    expect(recent[0]).toMatchObject({ projectRoot: '/tmp/one', projectName: 'one-renamed' })
  })

  it('keeps at most eight recent projects', async () => {
    for (let index = 0; index < 10; index++) {
      await rememberRecentProject(storePath, project(`/tmp/${index}`, String(index)))
    }

    const recent = await readRecentProjects(storePath)

    expect(recent).toHaveLength(8)
    expect(recent[0].projectRoot).toBe('/tmp/9')
    expect(recent.at(-1)?.projectRoot).toBe('/tmp/2')
  })
})

function project(projectRoot: string, projectName: string) {
  return {
    projectRoot,
    projectName,
    hasAgent: true,
  }
}
