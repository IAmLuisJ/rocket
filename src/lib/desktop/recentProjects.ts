import fs from 'fs-extra'
import { dirname } from 'path'

export interface RecentProject {
  projectRoot: string
  projectName: string
  hasAgent: boolean
  lastOpenedAt: string
}

export interface RememberedProject {
  projectRoot: string
  projectName: string
  hasAgent: boolean
}

const MAX_RECENT_PROJECTS = 8

export async function readRecentProjects(storePath: string): Promise<RecentProject[]> {
  if (!(await fs.pathExists(storePath))) return []

  try {
    const parsed = (await fs.readJson(storePath)) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecentProject)
  } catch {
    return []
  }
}

export async function rememberRecentProject(
  storePath: string,
  project: RememberedProject,
): Promise<RecentProject[]> {
  const existing = await readRecentProjects(storePath)
  const next: RecentProject = {
    ...project,
    lastOpenedAt: new Date().toISOString(),
  }
  const recent = [
    next,
    ...existing.filter((item) => item.projectRoot !== project.projectRoot),
  ].slice(0, MAX_RECENT_PROJECTS)

  await fs.ensureDir(dirname(storePath))
  await fs.writeJson(storePath, recent, { spaces: 2 })
  return recent
}

function isRecentProject(value: unknown): value is RecentProject {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.projectRoot === 'string' &&
    typeof candidate.projectName === 'string' &&
    typeof candidate.hasAgent === 'boolean' &&
    typeof candidate.lastOpenedAt === 'string'
  )
}
