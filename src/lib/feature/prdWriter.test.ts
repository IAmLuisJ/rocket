import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeFeatureSpec } from './prdWriter.js'

describe('prdWriter', () => {
  let tmpDir: string
  let prdPath: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-prd-'))
    await mkdir(join(tmpDir, '.agent', 'prd'), { recursive: true })
    prdPath = join(tmpDir, '.agent', 'prd', 'PRD.md')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('creates Features Added section when it does not exist', async () => {
    await writeFile(prdPath, '# PRD\n\n## Overview\nSome content\n')

    const section = await writeFeatureSpec('Add user auth with JWT tokens.', prdPath)
    expect(section).toBe('## Features Added')

    const content = await readFile(prdPath, 'utf-8')
    expect(content).toContain('## Features Added')
    expect(content).toContain('Add user auth with JWT tokens.')
  })

  it('appends under existing Features Added section', async () => {
    const existing = '# PRD\n\n## Features Added\n\n### 2026-01-01\n\nOld feature\n'
    await writeFile(prdPath, existing)

    await writeFeatureSpec('New feature spec here.', prdPath)

    const content = await readFile(prdPath, 'utf-8')
    expect(content).toContain('Old feature')
    expect(content).toContain('New feature spec here.')
    expect(content.match(/## Features Added/g)).toHaveLength(1)
    // The new spec should appear after the section header
    const idx1 = content.indexOf('## Features Added')
    const idx2 = content.indexOf('New feature spec here.')
    expect(idx2).toBeGreaterThan(idx1)
  })

  it('preserves existing PRD content', async () => {
    await writeFile(prdPath, '# PRD\n\n## Overview\nImportant content here\n')

    await writeFeatureSpec('Some spec.', prdPath)

    const content = await readFile(prdPath, 'utf-8')
    expect(content).toContain('Important content here')
    expect(content).toContain('Some spec.')
  })

  it('does not duplicate the same feature spec', async () => {
    await writeFile(prdPath, '# PRD\n')

    await writeFeatureSpec('Duplicate-resistant spec block.', prdPath)
    await writeFeatureSpec('Duplicate-resistant spec block.', prdPath)

    const content = await readFile(prdPath, 'utf-8')
    expect(content.match(/Duplicate-resistant spec block\./g)).toHaveLength(1)
  })

  it('handles an empty PRD file gracefully', async () => {
    await writeFile(prdPath, '')

    await writeFeatureSpec('First feature spec.', prdPath)

    const content = await readFile(prdPath, 'utf-8')
    expect(content).toContain('## Features Added')
    expect(content).toContain('First feature spec.')
  })
})
