import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '../..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const npmignorePath = join(root, '.npmignore')
const npmignore = existsSync(npmignorePath) ? readFileSync(npmignorePath, 'utf-8') : ''

describe('npm publish settings', () => {
  it('has a files field with required entries', () => {
    expect(pkg.files).toBeDefined()
    expect(pkg.files).toContain('dist/')
    expect(pkg.files).toContain('bin/')
    expect(pkg.files).toContain('templates/')
    expect(pkg.files).toContain('README.md')
    expect(pkg.files).toContain('CHANGELOG.md')
  })

  it('has publishConfig with public access', () => {
    expect(pkg.publishConfig).toBeDefined()
    expect(pkg.publishConfig.access).toBe('public')
  })

  it('has prepublishOnly script that runs build', () => {
    expect(pkg.scripts.prepublishOnly).toBe('npm run build')
  })

  it('files field does not include test files or .agent', () => {
    for (const entry of pkg.files) {
      expect(entry).not.toMatch(/\.test\./)
      expect(entry).not.toMatch(/\.agent/)
    }
  })
})

describe('.npmignore', () => {
  it('exists at project root', () => {
    expect(existsSync(npmignorePath)).toBe(true)
  })

  it('excludes src/ directory', () => {
    expect(npmignore).toMatch(/^src\/$/m)
  })

  it('excludes *.test.ts files', () => {
    expect(npmignore).toMatch(/\*\.test\.ts/)
  })

  it('excludes .agent/ directory', () => {
    expect(npmignore).toMatch(/^\.agent\/$/m)
  })

  it('excludes .github/ directory', () => {
    expect(npmignore).toMatch(/^\.github\/$/m)
  })

  it('excludes coverage/ directory', () => {
    expect(npmignore).toMatch(/^coverage\/$/m)
  })
})
