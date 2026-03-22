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

  it("'new' command has correct description and accepts [project-name]", async () => {
    const { program } = await import('./cli.js')
    const newCmd = program.commands.find((c) => c.name() === 'new')
    expect(newCmd).toBeDefined()
    expect(newCmd!.description()).toBe('Scaffold a new project from a template')
    expect(newCmd!.usage()).toContain('[project-name]')
  })

  it("'tasks' command has correct description and --filter flag", async () => {
    const { program } = await import('./cli.js')
    const tasksCmd = program.commands.find((c) => c.name() === 'tasks')
    expect(tasksCmd).toBeDefined()
    expect(tasksCmd!.description()).toBe('View and manage tasks')
    const helpText = tasksCmd!.helpInformation()
    expect(helpText).toContain('--filter <status>')
    expect(helpText).toContain('incomplete')
    expect(helpText).toContain('complete')
    expect(helpText).toContain('blocked')
  })

  it("'loop' command has --claude and --docker flags", async () => {
    const { program } = await import('./cli.js')
    const loopCmd = program.commands.find((c) => c.name() === 'loop')
    expect(loopCmd).toBeDefined()
    expect(loopCmd!.description()).toBe('Run the Rocket AI development loop')
    const helpText = loopCmd!.helpInformation()
    expect(helpText).toContain('--claude')
    expect(helpText).toContain('--docker')
    expect(helpText).toContain('Use Claude CLI directly')
    expect(helpText).toContain('Use Claude in Docker sandbox')
  })
})
