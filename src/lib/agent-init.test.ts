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
    expect(prompt).toContain('.agent/prd/PRD.md')

    // Verify PRD.md has template structure
    const prd = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')
    expect(prd).toContain('## Overview')
    expect(prd).toContain('## Core Features')
    expect(prd).toContain('## Technical Requirements')

    // Verify LOG.md content
    const log = await readFile(join(tmpDir, '.agent', 'logs', 'LOG.md'), 'utf-8')
    expect(log).toContain('# Development Log')
  })

  it('PRD.md has placeholder sections and instructional comments', async () => {
    await createAgentStructure(tmpDir)
    const prd = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')

    // Not empty
    expect(prd.length).toBeGreaterThan(0)

    // Has all required section headers
    expect(prd).toContain('## Overview')
    expect(prd).toContain('## Core Features')
    expect(prd).toContain('## Technical Requirements')

    // Has instructional comments
    expect(prd).toContain('<!-- Edit this file with your project requirements')
    expect(prd).toContain('<!-- Describe the purpose and goals')
    expect(prd).toContain('<!-- List the key features')
    expect(prd).toContain('<!-- Describe technical constraints')

    // Has placeholder content (not just headers and comments)
    expect(prd).toContain('Feature 1')
  })

  it('PROMPT.md contains exit tag instructions and PRD reference', async () => {
    await createAgentStructure(tmpDir)
    const prompt = await readFile(join(tmpDir, '.agent', 'PROMPT.md'), 'utf-8')

    // Must instruct AI to read the PRD
    expect(prompt).toContain('.agent/prd/PRD.md')
    expect(prompt).toContain('focus')

    // Must define all three exit tags
    expect(prompt).toContain('<complete>')
    expect(prompt).toContain('<blocked>')
    expect(prompt).toContain('<decide>')

    // Exit tags should have explanations of when to use them
    expect(prompt).toContain('task is fully implemented')
    expect(prompt).toContain('stuck')
    expect(prompt).toContain('decision')

    // Code quality guidelines
    expect(prompt).toContain('tests')
    expect(prompt).toContain('over-engineering')
    expect(prompt).toContain('errors gracefully')
    expect(prompt).toContain('Commit')

    // Available command guidance
    expect(prompt).toContain('rocket feature')
    expect(prompt).toContain('add a new feature')
    expect(prompt).toContain('automatically appends implementation tasks')
  })

  it('does not overwrite existing files when run twice', async () => {
    await createAgentStructure(tmpDir)

    // Modify a file to verify it is not overwritten
    const prdPath = join(tmpDir, '.agent', 'prd', 'PRD.md')
    const customContent = '# My Custom PRD\n'
    const { writeFile: wf } = await import('fs/promises')
    await wf(prdPath, customContent, 'utf-8')

    // Run again — should not throw and should not overwrite
    await createAgentStructure(tmpDir)

    const prd = await readFile(prdPath, 'utf-8')
    expect(prd).toBe(customContent)
  })
})
