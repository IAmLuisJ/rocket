import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('bin/rocket.ts entry point', () => {
  it('has shebang as first line', () => {
    const content = readFileSync(join(__dirname, '../bin/rocket.ts'), 'utf-8')
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true)
  })

  it('imports program from src/cli.js', () => {
    const content = readFileSync(join(__dirname, '../bin/rocket.ts'), 'utf-8')
    expect(content).toContain("from '../src/cli.js'")
  })

  it('calls program.parseAsync', () => {
    const content = readFileSync(join(__dirname, '../bin/rocket.ts'), 'utf-8')
    expect(content).toContain('program.parseAsync(process.argv)')
  })
})

describe('src/cli.ts Commander program', () => {
  it('exports a Commander program', async () => {
    const { program } = await import('./cli.js')
    expect(program.name()).toBe('rocket')
  })

  it('has the correct description', async () => {
    const { program } = await import('./cli.js')
    expect(program.description()).toBe('AI-powered project scaffolding and development loop')
  })

  it('has the correct version from package.json', async () => {
    const { program } = await import('./cli.js')
    const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
      version: string
    }
    expect(program.version()).toBe(pkg.version)
  })

  it('registers expected commands', async () => {
    const { program } = await import('./cli.js')
    const commandNames = program.commands.map((c) => c.name())
    expect(commandNames).toContain('new')
    expect(commandNames).toContain('loop')
    expect(commandNames).toContain('init')
    expect(commandNames).toContain('tasks')
    expect(commandNames).toContain('status')
    expect(commandNames).toContain('feature')
  })
})
