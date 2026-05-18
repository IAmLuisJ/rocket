import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readHistoryStats } from './historyReader.js'

describe('historyReader', () => {
  let tmpDir: string
  let agentDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rocket-history-'))
    agentDir = join(tmpDir, '.agent')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns zeros when history directory is missing', async () => {
    await expect(readHistoryStats(agentDir)).resolves.toEqual({
      sessionCount: 0,
      totalRuntimeSeconds: 0,
    })
  })

  it('counts unique history sessions and computes runtime from timestamp session ids', async () => {
    const historyDir = join(agentDir, 'history')
    await mkdir(historyDir, { recursive: true })
    await writeFile(join(historyDir, 'ITERATION-1000-1.txt'), 'one')
    await writeFile(join(historyDir, 'ITERATION-1000-3.txt'), 'three')
    await writeFile(join(historyDir, 'ITERATION-5000-1.txt'), 'one')
    await writeFile(join(historyDir, 'ITERATION-5000-2.txt'), 'two')

    await expect(readHistoryStats(agentDir)).resolves.toEqual({
      sessionCount: 2,
      totalRuntimeSeconds: 3,
    })
  })
})
