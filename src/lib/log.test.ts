import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { appendSessionLog, type SessionLog } from './log.js'

function makeLog(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    taskId: 1,
    taskTitle: 'Test task',
    backend: 'copilot',
    iterations: 3,
    outcome: 'complete',
    elapsedMs: 125000,
    timestamp: new Date('2026-03-20T10:00:00.000Z'),
    ...overrides,
  }
}

describe('appendSessionLog', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('creates LOG.md if it does not exist', async () => {
    await appendSessionLog(tmpDir, makeLog())
    const logPath = path.join(tmpDir, 'logs', 'LOG.md')
    expect(await fs.pathExists(logPath)).toBe(true)
  })

  it('writes a markdown section with all fields', async () => {
    await appendSessionLog(tmpDir, makeLog())
    const content = await fs.readFile(path.join(tmpDir, 'logs', 'LOG.md'), 'utf-8')
    expect(content).toContain('## Session 2026-03-20T10:00:00.000Z')
    expect(content).toContain('**Task**: #1 Test task')
    expect(content).toContain('**Backend**: copilot')
    expect(content).toContain('**Iterations**: 3')
    expect(content).toContain('**Outcome**: complete')
    expect(content).toContain('**Elapsed**: 2m 5s')
  })

  it('preserves existing content (append, not overwrite)', async () => {
    const logPath = path.join(tmpDir, 'logs', 'LOG.md')
    await fs.ensureDir(path.dirname(logPath))
    await fs.writeFile(logPath, '# Existing Log\n\n', 'utf-8')

    await appendSessionLog(tmpDir, makeLog())
    const content = await fs.readFile(logPath, 'utf-8')
    expect(content).toMatch(/^# Existing Log/)
    expect(content).toContain('## Session')
  })

  it('handles null taskId with Auto label', async () => {
    await appendSessionLog(tmpDir, makeLog({ taskId: null, taskTitle: null }))
    const content = await fs.readFile(path.join(tmpDir, 'logs', 'LOG.md'), 'utf-8')
    expect(content).toContain('**Task**: Auto')
  })

  it('formats elapsed time correctly for sub-minute durations', async () => {
    await appendSessionLog(tmpDir, makeLog({ elapsedMs: 45000 }))
    const content = await fs.readFile(path.join(tmpDir, 'logs', 'LOG.md'), 'utf-8')
    expect(content).toContain('**Elapsed**: 0m 45s')
  })
})
