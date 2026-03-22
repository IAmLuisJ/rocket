import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'

const CLIENT_DIR = join(import.meta.dirname, '../../templates/webapp/client')

describe('webapp template tailwind.config.js', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(join(CLIENT_DIR, 'tailwind.config.js'), 'utf-8')
  })

  it('tailwind.config.js exists', () => {
    expect(content).toBeDefined()
  })

  it('content paths include ./index.html', () => {
    expect(content).toContain('./index.html')
  })

  it('content paths include src/**/*.{ts,tsx}', () => {
    expect(content).toContain('./src/**/*.{ts,tsx}')
  })

  it('has CSS variable theme for background', () => {
    expect(content).toContain("background: 'hsl(var(--background))'")
  })

  it('has CSS variable theme for foreground', () => {
    expect(content).toContain("foreground: 'hsl(var(--foreground))'")
  })

  it('has primary color with DEFAULT and foreground', () => {
    expect(content).toContain("DEFAULT: 'hsl(var(--primary))'")
    expect(content).toContain("foreground: 'hsl(var(--primary-foreground))'")
  })

  it('has plugins array', () => {
    expect(content).toContain('plugins: []')
  })
})

describe('webapp template index.css CSS variables', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(join(CLIENT_DIR, 'src', 'index.css'), 'utf-8')
  })

  it('imports tailwindcss', () => {
    expect(content).toContain("@import 'tailwindcss'")
  })

  it('defines :root CSS variables for light theme', () => {
    expect(content).toContain(':root')
    expect(content).toContain('--background:')
    expect(content).toContain('--foreground:')
    expect(content).toContain('--primary:')
    expect(content).toContain('--primary-foreground:')
  })

  it('defines .dark CSS variables for dark theme', () => {
    expect(content).toContain('.dark')
  })

  it('defines border and input CSS variables', () => {
    expect(content).toContain('--border:')
    expect(content).toContain('--input:')
    expect(content).toContain('--ring:')
  })

  it('defines radius CSS variable', () => {
    expect(content).toContain('--radius:')
  })
})
