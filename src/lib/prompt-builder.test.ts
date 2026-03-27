import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPrompt } from './prompt-builder.js'
import type { Task } from './tasks/schema.js'
import fs from 'fs-extra'
import path from 'path'

vi.mock('fs-extra')

const mockTask: Task = {
  id: 42,
  title: 'Build the widget',
  description: 'Create a new widget component with full styling',
  category: 'functional',
  passes: false,
  passCondition: 'Widget renders correctly and passes visual tests',
}

describe('buildPrompt', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns string containing task title', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('Build the widget')
  })

  it('returns string containing task description', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('Create a new widget component with full styling')
  })

  it('returns string containing task passCondition', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('Widget renders correctly and passes visual tests')
  })

  it('includes PROMPT.md content when file exists', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath === path.join('/project/.agent', 'PROMPT.md')) {
        return 'Custom prompt instructions here'
      }
      throw new Error('not found')
    })
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('Custom prompt instructions here')
  })

  it('uses default prompt when PROMPT.md is missing', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('# Rocket Loop Prompt')
    expect(result).toContain('You are an autonomous coding agent')
  })

  it('includes PRD.md content when file exists', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath === path.join('/project/.agent', 'prd/PRD.md')) {
        return 'This is the PRD content'
      }
      throw new Error('not found')
    })
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('This is the PRD content')
    expect(result).toContain('## Project PRD')
  })

  it('omits PRD section when PRD.md is missing', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).not.toContain('## Project PRD')
  })

  it('includes task ID in output', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('not found'))
    const result = await buildPrompt(mockTask, '/project/.agent')
    expect(result).toContain('**ID**: 42')
  })
})
