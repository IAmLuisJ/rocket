import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { processTemplate } from './template-engine.js'

describe('template engine', () => {
  let srcDir: string
  let destDir: string

  beforeEach(async () => {
    srcDir = await mkdtemp(join(tmpdir(), 'rocket-tmpl-src-'))
    destDir = await mkdtemp(join(tmpdir(), 'rocket-tmpl-dest-'))
  })

  afterEach(async () => {
    await rm(srcDir, { recursive: true, force: true })
    await rm(destDir, { recursive: true, force: true })
  })

  it('replaces {{TOKENS}} in text files', async () => {
    await writeFile(join(srcDir, 'readme.md'), '# {{PROJECT_NAME}}')
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'my-app' })
    const content = await readFile(join(destDir, 'readme.md'), 'utf-8')
    expect(content).toBe('# my-app')
  })

  it('leaves unknown tokens unchanged', async () => {
    await writeFile(join(srcDir, 'test.txt'), '{{UNKNOWN_TOKEN}}')
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'app' })
    const content = await readFile(join(destDir, 'test.txt'), 'utf-8')
    expect(content).toBe('{{UNKNOWN_TOKEN}}')
  })

  it('strips .tmpl extension from output filename', async () => {
    await writeFile(join(srcDir, 'package.json.tmpl'), '{"name":"{{PROJECT_NAME}}"}')
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'test' })
    const content = await readFile(join(destDir, 'package.json'), 'utf-8')
    expect(content).toBe('{"name":"test"}')
  })

  it('handles nested directories', async () => {
    await mkdir(join(srcDir, 'sub'), { recursive: true })
    await writeFile(join(srcDir, 'sub', 'file.txt'), 'hello {{PROJECT_NAME}}')
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'nested' })
    const content = await readFile(join(destDir, 'sub', 'file.txt'), 'utf-8')
    expect(content).toBe('hello nested')
  })

  it('replaces multiple occurrences of the same token', async () => {
    await writeFile(
      join(srcDir, 'file.txt'),
      '{{PROJECT_NAME}} is called {{PROJECT_NAME}} and again {{PROJECT_NAME}}',
    )
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'my-app' })
    const content = await readFile(join(destDir, 'file.txt'), 'utf-8')
    expect(content).toBe('my-app is called my-app and again my-app')
  })

  it('copies binary files without modification', async () => {
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG header
    await writeFile(join(srcDir, 'logo.png'), binaryData)
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'app' })
    const output = await readFile(join(destDir, 'logo.png'))
    expect(Buffer.compare(output, binaryData)).toBe(0)
  })

  it('renames .gitignore.tmpl to .gitignore', async () => {
    await writeFile(join(srcDir, '.gitignore.tmpl'), 'node_modules/\ndist/')
    await processTemplate(srcDir, destDir, { PROJECT_NAME: 'app' })
    const content = await readFile(join(destDir, '.gitignore'), 'utf-8')
    expect(content).toBe('node_modules/\ndist/')
  })

  it('exports processTemplate function', async () => {
    expect(typeof processTemplate).toBe('function')
  })
})
