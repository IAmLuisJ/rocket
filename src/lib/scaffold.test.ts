import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, stat, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { scaffold } from './scaffold.js'

describe('scaffold webapp template', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-scaffold-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates full webapp directory structure with auth option', async () => {
    const projectDir = join(tmpDir, 'test-app')
    await scaffold('webapp', 'test-app', projectDir, { auth: true })

    // Verify top-level files
    await access(join(projectDir, 'package.json'))
    await access(join(projectDir, '.gitignore'))

    // Verify package.json content
    const pkgRaw = await readFile(join(projectDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw)
    expect(pkg.name).toBe('test-app')

    // Verify client directory
    const clientDir = join(projectDir, 'client')
    await access(join(clientDir, 'package.json'))
    await access(join(clientDir, '.env.example'))
    await access(join(clientDir, 'vite.config.ts'))
    await access(join(clientDir, 'tsconfig.json'))
    await access(join(clientDir, 'src', 'main.tsx'))
    await access(join(clientDir, 'src', 'App.tsx'))

    // Verify server directory
    const serverDir = join(projectDir, 'server')
    await access(join(serverDir, 'package.json'))
    await access(join(serverDir, '.env.example'))
    await access(join(serverDir, 'tsconfig.json'))
    await access(join(serverDir, 'src', 'index.ts'))

    // Verify .agent/ structure
    const agentDir = join(projectDir, '.agent')
    const s = await stat(agentDir)
    expect(s.isDirectory()).toBe(true)
    await access(join(agentDir, 'tasks.json'))
    await access(join(agentDir, 'PROMPT.md'))
    await access(join(agentDir, 'prd', 'PRD.md'))
    await access(join(agentDir, 'prd', 'SUMMARY.md'))
    await access(join(agentDir, 'logs', 'LOG.md'))

    // Verify .agent/history directory exists
    const histStat = await stat(join(agentDir, 'history'))
    expect(histStat.isDirectory()).toBe(true)

    // Verify tasks.json is empty
    const tasks = await readFile(join(agentDir, 'tasks.json'), 'utf-8')
    expect(JSON.parse(tasks)).toEqual({ tasks: [] })

    // Verify project name substitution in PROMPT.md
    const prompt = await readFile(join(agentDir, 'PROMPT.md'), 'utf-8')
    expect(prompt).toContain('test-app')
  })

  it('sanitizes project name in generated files', async () => {
    const projectDir = join(tmpDir, 'my-app')
    await scaffold('webapp', 'My App', projectDir)

    const pkgRaw = await readFile(join(projectDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw)
    expect(pkg.name).toBe('my-app')
  })
})
