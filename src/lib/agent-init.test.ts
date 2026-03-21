import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, access, stat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createAgentStructure } from './agent-init.js'

describe('createAgentStructure', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-init-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates all expected directories', async () => {
    await createAgentStructure(tmpDir)

    const dirs = ['.agent', '.agent/prd', '.agent/logs', '.agent/history']
    for (const dir of dirs) {
      const s = await stat(join(tmpDir, dir))
      expect(s.isDirectory(), `${dir} should be a directory`).toBe(true)
    }
  })

  it('creates all expected files with correct content', async () => {
    await createAgentStructure(tmpDir)

    // Verify files exist
    await access(join(tmpDir, '.agent', 'tasks.json'))
    await access(join(tmpDir, '.agent', 'PROMPT.md'))
    await access(join(tmpDir, '.agent', 'prd', 'PRD.md'))
    await access(join(tmpDir, '.agent', 'prd', 'SUMMARY.md'))
    await access(join(tmpDir, '.agent', 'logs', 'LOG.md'))

    // Verify tasks.json content
    const tasks = await readFile(join(tmpDir, '.agent', 'tasks.json'), 'utf-8')
    expect(JSON.parse(tasks)).toEqual({ tasks: [] })

    // Verify PROMPT.md content
    const prompt = await readFile(join(tmpDir, '.agent', 'PROMPT.md'), 'utf-8')
    expect(prompt).toContain('Rocket Loop Prompt')
    expect(prompt).toContain('<complete>')
    expect(prompt).toContain('<blocked>')
    expect(prompt).toContain('<decide>')

    // Verify PRD.md has template structure
    const prd = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')
    expect(prd).toContain('# Product Requirements Document')
    expect(prd).toContain('## Features')

    // Verify LOG.md content
    const log = await readFile(join(tmpDir, '.agent', 'logs', 'LOG.md'), 'utf-8')
    expect(log).toContain('# Development Log')
  })

  it('throws if .agent/ already exists', async () => {
    await createAgentStructure(tmpDir)
    await expect(createAgentStructure(tmpDir)).rejects.toThrow('.agent/ already exists')
  })
})
