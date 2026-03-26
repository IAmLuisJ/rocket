import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, stat, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

const mockedExecSync = vi.mocked(execSync)

import { scaffold, sanitizeProjectName } from './scaffold.js'

describe('scaffold webapp template', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-scaffold-'))
    mockedExecSync.mockReset()
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates full webapp directory structure', async () => {
    const projectDir = join(tmpDir, 'test-app')
    await scaffold('webapp', 'test-app', projectDir, {})

    // Verify top-level files
    await access(join(projectDir, 'package.json'))
    await access(join(projectDir, '.gitignore'))

    // Verify package.json content has PROJECT_NAME substituted
    const pkgRaw = await readFile(join(projectDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw)
    expect(pkg.name).toBe('test-app')

    // Verify client directory
    const clientDir = join(projectDir, 'client')
    await access(join(clientDir, 'package.json'))
    await access(join(clientDir, 'vite.config.ts'))
    await access(join(clientDir, 'src', 'main.tsx'))
    await access(join(clientDir, 'src', 'App.tsx'))

    // Verify server directory
    const serverDir = join(projectDir, 'server')
    await access(join(serverDir, 'package.json'))
    await access(join(serverDir, 'src', 'index.ts'))
  })

  it('creates .agent/ structure in scaffolded project', async () => {
    const projectDir = join(tmpDir, 'test-app')
    await scaffold('webapp', 'test-app', projectDir, {})

    const agentDir = join(projectDir, '.agent')
    const s = await stat(agentDir)
    expect(s.isDirectory()).toBe(true)
    await access(join(agentDir, 'tasks.json'))
    await access(join(agentDir, 'PROMPT.md'))
    await access(join(agentDir, 'prd', 'PRD.md'))
    await access(join(agentDir, 'prd', 'SUMMARY.md'))
    await access(join(agentDir, 'logs', 'LOG.md'))

    const histStat = await stat(join(agentDir, 'history'))
    expect(histStat.isDirectory()).toBe(true)

    const tasks = await readFile(join(agentDir, 'tasks.json'), 'utf-8')
    expect(JSON.parse(tasks)).toEqual({ tasks: [] })

    const prompt = await readFile(join(agentDir, 'PROMPT.md'), 'utf-8')
    expect(prompt).toContain('test-app')
  })

  it('runs npm install in the project directory', async () => {
    const projectDir = join(tmpDir, 'test-app')
    await scaffold('webapp', 'test-app', projectDir, {})

    expect(mockedExecSync).toHaveBeenCalledWith(
      'npm install',
      expect.objectContaining({ cwd: projectDir, stdio: 'inherit' }),
    )
  })

  it('runs git init, git add, and git commit', async () => {
    const projectDir = join(tmpDir, 'test-app')
    await scaffold('webapp', 'test-app', projectDir, {})

    expect(mockedExecSync).toHaveBeenCalledWith(
      'git init',
      expect.objectContaining({ cwd: projectDir, stdio: 'inherit' }),
    )
    expect(mockedExecSync).toHaveBeenCalledWith(
      'git add -A',
      expect.objectContaining({ cwd: projectDir, stdio: 'inherit' }),
    )
    expect(mockedExecSync).toHaveBeenCalledWith(
      'git commit -m "Initial commit from Rocket"',
      expect.objectContaining({ cwd: projectDir, stdio: 'inherit' }),
    )
  })

  it('sanitizes project name in generated files', async () => {
    const projectDir = join(tmpDir, 'my-app')
    await scaffold('webapp', 'My App', projectDir)

    const pkgRaw = await readFile(join(projectDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw)
    expect(pkg.name).toBe('my-app')
  })

  it('calls onProgress callback with sequential steps', async () => {
    const projectDir = join(tmpDir, 'test-app')
    const steps: string[] = []
    await scaffold('webapp', 'test-app', projectDir, {}, (step) => {
      steps.push(step)
    })

    expect(steps).toEqual(['scaffolding', 'installing', 'git', 'done'])
  })

  it('handles npm install failure gracefully', async () => {
    mockedExecSync.mockImplementation((cmd) => {
      if (cmd === 'npm install') throw new Error('npm failed')
      return Buffer.from('')
    })

    const projectDir = join(tmpDir, 'test-app')
    // Should not throw
    await scaffold('webapp', 'test-app', projectDir, {})

    // git init should still be called after npm install failure
    expect(mockedExecSync).toHaveBeenCalledWith(
      'git init',
      expect.objectContaining({ cwd: projectDir }),
    )
  })
})

describe('sanitizeProjectName', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(sanitizeProjectName('My App')).toBe('my-app')
  })

  it('removes invalid characters', () => {
    expect(sanitizeProjectName('test@app!')).toBe('testapp')
  })

  it('throws on empty result', () => {
    expect(() => sanitizeProjectName('!!!')).toThrow('empty after sanitization')
  })
})
