import { beforeAll, describe, it, expect } from 'vitest'
import { access, readFile } from 'fs/promises'
import { join } from 'path'

const TEMPLATES_DIR = join(import.meta.dirname, '../../templates')

describe('webapp template directory structure', () => {
  it('has templates/webapp/ directory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/client/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'client'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/server/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'server'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/client/src/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'client', 'src'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/server/src/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'server', 'src'))).resolves.toBeUndefined()
  })
})

describe('webapp template root package.json', () => {
  let pkg: Record<string, unknown>

  beforeAll(async () => {
    const content = await readFile(join(TEMPLATES_DIR, 'webapp', 'package.json.tmpl'), 'utf-8')
    pkg = JSON.parse(content)
  })

  it('package.json.tmpl exists and is valid JSON', () => {
    expect(pkg).toBeDefined()
  })

  it('uses {{PROJECT_NAME}} placeholder for name', () => {
    expect(pkg.name).toBe('{{PROJECT_NAME}}')
  })

  it('has workspaces for client and server', () => {
    expect(pkg.workspaces).toEqual(['client', 'server'])
  })

  it('dev script runs both client and server', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.dev).toContain('--workspace=client')
    expect(scripts.dev).toContain('--workspace=server')
  })

  it('build script builds both workspaces', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.build).toContain('--workspace=client')
    expect(scripts.build).toContain('--workspace=server')
  })

  it('test script runs tests in all workspaces', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.test).toContain('--workspaces')
  })
})
