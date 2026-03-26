import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { saveIteration } from './history.js'

describe('saveIteration', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('writes iteration file with correct filename pattern', async () => {
    await saveIteration(tmpDir, '20260321-235505', 1, 'hello world')
    const file = path.join(tmpDir, 'history', 'ITERATION-20260321-235505-1.txt')
    expect(await fs.pathExists(file)).toBe(true)
    expect(await fs.readFile(file, 'utf-8')).toBe('hello world')
  })

  it('strips ANSI escape codes from output', async () => {
    const ansiOutput = '\x1b[31mred text\x1b[0m and \x1b[1;32mbold green\x1b[0m'
    await saveIteration(tmpDir, 'sess1', 1, ansiOutput)
    const file = path.join(tmpDir, 'history', 'ITERATION-sess1-1.txt')
    const content = await fs.readFile(file, 'utf-8')
    expect(content).toBe('red text and bold green')
    expect(content).not.toContain('\x1b')
  })

  it('creates history directory if it does not exist', async () => {
    const historyDir = path.join(tmpDir, 'history')
    expect(await fs.pathExists(historyDir)).toBe(false)
    await saveIteration(tmpDir, 'sess2', 3, 'output')
    expect(await fs.pathExists(historyDir)).toBe(true)
  })

  it('handles empty output', async () => {
    await saveIteration(tmpDir, 'sess3', 1, '')
    const file = path.join(tmpDir, 'history', 'ITERATION-sess3-1.txt')
    expect(await fs.readFile(file, 'utf-8')).toBe('')
  })

  it('handles multiple iterations in same session', async () => {
    await saveIteration(tmpDir, 'sess4', 1, 'first')
    await saveIteration(tmpDir, 'sess4', 2, 'second')
    const f1 = path.join(tmpDir, 'history', 'ITERATION-sess4-1.txt')
    const f2 = path.join(tmpDir, 'history', 'ITERATION-sess4-2.txt')
    expect(await fs.readFile(f1, 'utf-8')).toBe('first')
    expect(await fs.readFile(f2, 'utf-8')).toBe('second')
  })
})
