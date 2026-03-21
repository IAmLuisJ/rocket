import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { appendFeatureSpec } from './prdWriter.js'

describe('prdWriter', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-prd-'))
    await mkdir(join(tmpDir, '.agent', 'prd'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates Features Added section when it does not exist', async () => {
    await writeFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), '# PRD\n\n## Overview\nSome content\n')

    const section = appendFeatureSpec(tmpDir, 'Add user auth with JWT tokens.')
    expect(section).toBe('## Features Added')

    const content = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')
    expect(content).toContain('## Features Added')
    expect(content).toContain('Add user auth with JWT tokens.')
  })

  it('appends under existing Features Added section', async () => {
    const existing = '# PRD\n\n## Features Added\n\n### 2026-01-01\n\nOld feature\n'
    await writeFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), existing)

    appendFeatureSpec(tmpDir, 'New feature spec here.')

    const content = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')
    expect(content).toContain('Old feature')
    expect(content).toContain('New feature spec here.')
    // The new spec should appear after the section header
    const idx1 = content.indexOf('## Features Added')
    const idx2 = content.indexOf('New feature spec here.')
    expect(idx2).toBeGreaterThan(idx1)
  })

  it('preserves existing PRD content', async () => {
    await writeFile(
      join(tmpDir, '.agent', 'prd', 'PRD.md'),
      '# PRD\n\n## Overview\nImportant content here\n',
    )

    appendFeatureSpec(tmpDir, 'Some spec.')

    const content = await readFile(join(tmpDir, '.agent', 'prd', 'PRD.md'), 'utf-8')
    expect(content).toContain('Important content here')
    expect(content).toContain('Some spec.')
  })
})
