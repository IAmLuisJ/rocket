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

describe('webapp template client package.json', () => {
  let pkg: Record<string, unknown>
  let deps: Record<string, string>
  let devDeps: Record<string, string>
  let scripts: Record<string, string>

  beforeAll(async () => {
    const content = await readFile(
      join(TEMPLATES_DIR, 'webapp', 'client', 'package.json.tmpl'),
      'utf-8',
    )
    pkg = JSON.parse(content)
    deps = pkg.dependencies as Record<string, string>
    devDeps = pkg.devDependencies as Record<string, string>
    scripts = pkg.scripts as Record<string, string>
  })

  it('uses {{PROJECT_NAME}}-client as name', () => {
    expect(pkg.name).toBe('{{PROJECT_NAME}}-client')
  })

  it('has react and react-dom ^19', () => {
    expect(deps.react).toMatch(/^\^19/)
    expect(deps['react-dom']).toMatch(/^\^19/)
  })

  it('has typescript ^5.9', () => {
    expect(devDeps.typescript).toMatch(/^\^5\.9/)
  })

  it('has vite ^7', () => {
    expect(devDeps.vite).toMatch(/^\^7/)
  })

  it('has @tanstack/react-query ^5', () => {
    expect(deps['@tanstack/react-query']).toMatch(/^\^5/)
  })

  it('has react-router-dom ^7', () => {
    expect(deps['react-router-dom']).toMatch(/^\^7/)
  })

  it('has react-hook-form and zod', () => {
    expect(deps['react-hook-form']).toBeDefined()
    expect(deps.zod).toBeDefined()
  })

  it('has tailwindcss ^4', () => {
    expect(devDeps.tailwindcss).toMatch(/^\^4/)
  })

  it('has vitest and @testing-library/react in devDependencies', () => {
    expect(devDeps.vitest).toBeDefined()
    expect(devDeps['@testing-library/react']).toBeDefined()
  })

  it('has required scripts', () => {
    expect(scripts.dev).toBe('vite')
    expect(scripts.build).toBe('tsc -b && vite build')
    expect(scripts.test).toBe('vitest run')
    expect(scripts.lint).toBe('eslint src/')
  })
})
