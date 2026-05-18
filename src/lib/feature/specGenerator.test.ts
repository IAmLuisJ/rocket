import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseSpecResponse } from './specGenerator.js'

describe('parseSpecResponse', () => {
  let tmpDir: string
  let agentDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-spec-'))
    agentDir = join(tmpDir, '.agent')
    await mkdir(join(agentDir, 'logs'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('parses JSON wrapped in markdown code fences', async () => {
    const parsed = await parseSpecResponse(
      [
        'Here is the result:',
        '```json',
        '{"spec":"## Dark Mode\\nAdd a theme toggle.","tasks":[{"title":"Add toggle","description":"desc","category":"ui-ux","passes":false,"passCondition":"toggle works"}]}',
        '```',
      ].join('\n'),
      agentDir,
    )

    expect(parsed.specMarkdown).toContain('Dark Mode')
    expect(parsed.tasks).toEqual([
      {
        title: 'Add toggle',
        description: 'desc',
        category: 'ui-ux',
        passes: false,
        passCondition: 'toggle works',
      },
    ])
  })

  it('logs raw output on malformed JSON', async () => {
    await expect(parseSpecResponse('```json\n{"spec": "oops"\n```', agentDir)).rejects.toThrow(
      'Could not parse AI response',
    )

    const log = await readFile(join(agentDir, 'logs', 'LOG.md'), 'utf-8')
    expect(log).toContain('## Feature Generation Error')
    expect(log).toContain('{"spec": "oops"')
  })
})
