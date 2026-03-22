import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'

const ESLINT_CONFIG_PATH = join(
  import.meta.dirname,
  '../../templates/webapp/client/eslint.config.js',
)
const CLIENT_PKG_PATH = join(import.meta.dirname, '../../templates/webapp/client/package.json.tmpl')

describe('webapp template: ESLint flat config', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(ESLINT_CONFIG_PATH, 'utf-8')
  })

  it('eslint.config.js exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0)
  })

  it('imports typescript-eslint unified package', () => {
    expect(content).toContain("import tseslint from 'typescript-eslint'")
  })

  it('uses tseslint.config() wrapper', () => {
    expect(content).toContain('tseslint.config(')
  })

  it('extends js.configs.recommended', () => {
    expect(content).toContain('js.configs.recommended')
  })

  it('extends tseslint.configs.recommended', () => {
    expect(content).toContain('tseslint.configs.recommended')
  })

  it('imports and configures eslint-plugin-react-hooks', () => {
    expect(content).toContain("import reactHooks from 'eslint-plugin-react-hooks'")
    expect(content).toContain("'react-hooks': reactHooks")
    expect(content).toContain('reactHooks.configs.recommended.rules')
  })

  it('imports and configures eslint-plugin-react-refresh', () => {
    expect(content).toContain("import reactRefresh from 'eslint-plugin-react-refresh'")
    expect(content).toContain("'react-refresh': reactRefresh")
    expect(content).toContain('react-refresh/only-export-components')
  })

  it('sets ecmaVersion 2020 and browser globals', () => {
    expect(content).toContain('ecmaVersion: 2020')
    expect(content).toContain('globals.browser')
  })

  it('targets ts and tsx files', () => {
    expect(content).toMatch(/files:\s*\[.*\*\*\/\*\.\{ts,tsx\}/)
  })

  it('ignores dist directory', () => {
    expect(content).toContain("ignores: ['dist/']")
  })
})

describe('webapp template: client package.json includes ESLint deps', () => {
  let pkg: Record<string, unknown>

  beforeAll(async () => {
    const raw = await readFile(CLIENT_PKG_PATH, 'utf-8')
    pkg = JSON.parse(raw)
  })

  it('has eslint in devDependencies', () => {
    expect((pkg.devDependencies as Record<string, string>).eslint).toBeDefined()
  })

  it('has @eslint/js in devDependencies', () => {
    expect((pkg.devDependencies as Record<string, string>)['@eslint/js']).toBeDefined()
  })

  it('has globals in devDependencies', () => {
    expect((pkg.devDependencies as Record<string, string>).globals).toBeDefined()
  })

  it('has eslint-plugin-react-hooks in devDependencies', () => {
    expect(
      (pkg.devDependencies as Record<string, string>)['eslint-plugin-react-hooks'],
    ).toBeDefined()
  })

  it('has eslint-plugin-react-refresh in devDependencies', () => {
    expect(
      (pkg.devDependencies as Record<string, string>)['eslint-plugin-react-refresh'],
    ).toBeDefined()
  })

  it('has typescript-eslint in devDependencies', () => {
    expect((pkg.devDependencies as Record<string, string>)['typescript-eslint']).toBeDefined()
  })
})
