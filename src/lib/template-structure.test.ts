import { beforeAll, describe, it, expect } from 'vitest'
import { access, readFile } from 'fs/promises'
import { join } from 'path'

const TEMPLATES_DIR = join(import.meta.dirname, '../../templates')

describe('webapp template directory structure', () => {
  it('has templates/webapp/ directory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/client/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'client'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/server/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'server'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/client/src/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'client', 'src'))).resolves.toBeUndefined()
  })

  it('has templates/webapp/server/src/ subdirectory', async () => {
    await expect(access(join(TEMPLATES_DIR, 'webapp', 'server', 'src'))).resolves.toBeUndefined()
  })
})

describe('webapp template root package.json', () => {
  let pkg: Record<string, unknown>

  beforeAll(async () => {
    const content = await readFile(join(TEMPLATES_DIR, 'webapp', 'package.json.tmpl'), 'utf-8')
    pkg = JSON.parse(content)
  })

  it('package.json.tmpl exists and is valid JSON', () => {
    expect(pkg).toBeDefined()
  })

  it('uses {{PROJECT_NAME}} placeholder for name', () => {
    expect(pkg.name).toBe('{{PROJECT_NAME}}')
  })

  it('has workspaces for client and server', () => {
    expect(pkg.workspaces).toEqual(['client', 'server'])
  })

  it('dev script runs both client and server', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.dev).toContain('--workspace=client')
    expect(scripts.dev).toContain('--workspace=server')
  })

  it('build script builds both workspaces', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.build).toContain('--workspace=client')
    expect(scripts.build).toContain('--workspace=server')
  })

  it('test script runs tests in all workspaces', () => {
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.test).toContain('--workspaces')
  })
})

describe('webapp template server package.json', () => {
  let pkg: Record<string, unknown>
  let deps: Record<string, string>
  let devDeps: Record<string, string>
  let scripts: Record<string, string>

  beforeAll(async () => {
    const content = await readFile(
      join(TEMPLATES_DIR, 'webapp', 'server', 'package.json.tmpl'),
      'utf-8',
    )
    pkg = JSON.parse(content)
    deps = pkg.dependencies as Record<string, string>
    devDeps = pkg.devDependencies as Record<string, string>
    scripts = pkg.scripts as Record<string, string>
  })

  it('uses {{PROJECT_NAME}}-server as name', () => {
    expect(pkg.name).toBe('{{PROJECT_NAME}}-server')
  })

  it('is type module', () => {
    expect(pkg.type).toBe('module')
  })

  it('has express ^5', () => {
    expect(deps.express).toMatch(/^\^5/)
  })

  it('has better-sqlite3', () => {
    expect(deps['better-sqlite3']).toBeDefined()
  })

  it('has jsonwebtoken', () => {
    expect(deps.jsonwebtoken).toBeDefined()
  })

  it('has bcryptjs', () => {
    expect(deps.bcryptjs).toBeDefined()
  })

  it('has nodemailer', () => {
    expect(deps.nodemailer).toBeDefined()
  })

  it('has zod', () => {
    expect(deps.zod).toBeDefined()
  })

  it('has cors', () => {
    expect(deps.cors).toBeDefined()
  })

  it('has tsx and vitest in devDependencies', () => {
    expect(devDeps.tsx).toBeDefined()
    expect(devDeps.vitest).toBeDefined()
  })

  it('has @types for express, better-sqlite3, jsonwebtoken, bcryptjs, nodemailer, cors', () => {
    expect(devDeps['@types/express']).toBeDefined()
    expect(devDeps['@types/better-sqlite3']).toBeDefined()
    expect(devDeps['@types/jsonwebtoken']).toBeDefined()
    expect(devDeps['@types/bcryptjs']).toBeDefined()
    expect(devDeps['@types/nodemailer']).toBeDefined()
    expect(devDeps['@types/cors']).toBeDefined()
  })

  it('has required scripts', () => {
    expect(scripts.dev).toBe('tsx watch src/index.ts')
    expect(scripts.build).toBe('tsc -p tsconfig.json')
    expect(scripts.start).toBe('node dist/index.js')
    expect(scripts.test).toBe('vitest run')
  })
})

describe('webapp template vite.config.ts', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(join(TEMPLATES_DIR, 'webapp', 'client', 'vite.config.ts'), 'utf-8')
  })

  it('vite.config.ts exists', () => {
    expect(content).toBeDefined()
  })

  it('configures React plugin', () => {
    expect(content).toContain("from '@vitejs/plugin-react'")
    expect(content).toContain('react()')
  })

  it('configures @/* path alias pointing to src/', () => {
    expect(content).toContain("'@'")
    expect(content).toContain("'src'")
  })

  it('configures vitest with jsdom environment', () => {
    expect(content).toContain("environment: 'jsdom'")
  })

  it('sets up test globals', () => {
    expect(content).toContain('globals: true')
  })

  it('references test setup file', () => {
    expect(content).toContain('setup.ts')
  })
})

describe('webapp template test setup file', () => {
  it('src/test/setup.ts exists with jest-dom import', async () => {
    const content = await readFile(
      join(TEMPLATES_DIR, 'webapp', 'client', 'src', 'test', 'setup.ts'),
      'utf-8',
    )
    expect(content).toContain('@testing-library/jest-dom')
  })
})

describe('webapp template tsconfig files', () => {
  const clientDir = join(TEMPLATES_DIR, 'webapp', 'client')
  const serverDir = join(TEMPLATES_DIR, 'webapp', 'server')

  it('client tsconfig.json exists with composite references', async () => {
    const content = await readFile(join(clientDir, 'tsconfig.json'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.files).toEqual([])
    expect(config.references).toEqual([
      { path: './tsconfig.app.json' },
      { path: './tsconfig.node.json' },
    ])
  })

  it('client tsconfig.app.json has correct compilerOptions', async () => {
    const content = await readFile(join(clientDir, 'tsconfig.app.json'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.compilerOptions.target).toBe('ES2022')
    expect(config.compilerOptions.module).toBe('ESNext')
    expect(config.compilerOptions.moduleResolution).toMatch(/^[Bb]undler$/)
    expect(config.compilerOptions.jsx).toBe('react-jsx')
    expect(config.compilerOptions.strict).toBe(true)
  })

  it('client tsconfig.app.json has @/* path alias', async () => {
    const content = await readFile(join(clientDir, 'tsconfig.app.json'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.compilerOptions.paths['@/*']).toEqual(['./src/*'])
  })

  it('client tsconfig.node.json includes vite.config.ts', async () => {
    const content = await readFile(join(clientDir, 'tsconfig.node.json'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.include).toContain('vite.config.ts')
    expect(config.compilerOptions.target).toBe('ES2022')
  })

  it('server tsconfig.json uses NodeNext module resolution', async () => {
    const content = await readFile(join(serverDir, 'tsconfig.json'), 'utf-8')
    const config = JSON.parse(content)
    expect(config.compilerOptions.module).toBe('NodeNext')
    expect(config.compilerOptions.moduleResolution).toBe('NodeNext')
    expect(config.compilerOptions.strict).toBe(true)
    expect(config.compilerOptions.outDir).toBe('dist')
    expect(config.compilerOptions.rootDir).toBe('src')
    expect(config.compilerOptions.declaration).toBe(true)
  })
})

describe('webapp template client package.json', () => {
  let pkg: Record<string, unknown>
  let deps: Record<string, string>
  let devDeps: Record<string, string>
  let scripts: Record<string, string>

  beforeAll(async () => {
    const content = await readFile(
      join(TEMPLATES_DIR, 'webapp', 'client', 'package.json.tmpl'),
      'utf-8',
    )
    pkg = JSON.parse(content)
    deps = pkg.dependencies as Record<string, string>
    devDeps = pkg.devDependencies as Record<string, string>
    scripts = pkg.scripts as Record<string, string>
  })

  it('uses {{PROJECT_NAME}}-client as name', () => {
    expect(pkg.name).toBe('{{PROJECT_NAME}}-client')
  })

  it('has react and react-dom ^19', () => {
    expect(deps.react).toMatch(/^\^19/)
    expect(deps['react-dom']).toMatch(/^\^19/)
  })

  it('has typescript ^5.9', () => {
    expect(devDeps.typescript).toMatch(/^\^5\.9/)
  })

  it('has vite ^7', () => {
    expect(devDeps.vite).toMatch(/^\^7/)
  })

  it('has @tanstack/react-query ^5', () => {
    expect(deps['@tanstack/react-query']).toMatch(/^\^5/)
  })

  it('has react-router-dom ^7', () => {
    expect(deps['react-router-dom']).toMatch(/^\^7/)
  })

  it('has react-hook-form and zod', () => {
    expect(deps['react-hook-form']).toBeDefined()
    expect(deps.zod).toBeDefined()
  })

  it('has tailwindcss ^4', () => {
    expect(devDeps.tailwindcss).toMatch(/^\^4/)
  })

  it('has vitest and @testing-library/react in devDependencies', () => {
    expect(devDeps.vitest).toBeDefined()
    expect(devDeps['@testing-library/react']).toBeDefined()
  })

  it('has required scripts', () => {
    expect(scripts.dev).toBe('vite')
    expect(scripts.build).toBe('tsc -b && vite build')
    expect(scripts.test).toBe('vitest run')
    expect(scripts.lint).toBe('eslint src/')
  })
})

describe('webapp template .env.example files', () => {
  let serverEnv: string
  let clientEnv: string

  beforeAll(async () => {
    serverEnv = await readFile(join(TEMPLATES_DIR, 'webapp', 'server', '.env.example'), 'utf-8')
    clientEnv = await readFile(join(TEMPLATES_DIR, 'webapp', 'client', '.env.example'), 'utf-8')
  })

  it('server .env.example contains DATABASE_URL placeholder', () => {
    expect(serverEnv).toContain('DATABASE_URL=')
  })

  it('server .env.example contains JWT_SECRET placeholder', () => {
    expect(serverEnv).toContain('JWT_SECRET=')
    expect(serverEnv).not.toMatch(/JWT_SECRET=\s*$/)
  })

  it('server .env.example contains PORT placeholder', () => {
    expect(serverEnv).toContain('PORT=3001')
  })

  it('server .env.example contains SMTP placeholders', () => {
    expect(serverEnv).toContain('SMTP_HOST=')
    expect(serverEnv).toContain('SMTP_PORT=')
    expect(serverEnv).toContain('SMTP_USER=')
    expect(serverEnv).toContain('SMTP_PASS=')
  })

  it('server .env.example has comment about JWT_SECRET security', () => {
    expect(serverEnv).toMatch(/strong random value/i)
  })

  it('client .env.example contains VITE_API_URL placeholder', () => {
    expect(clientEnv).toContain('VITE_API_URL=http://localhost:3001')
  })

  it('no real secrets are present in server .env.example', () => {
    expect(serverEnv).toContain('example.com')
    expect(serverEnv).not.toMatch(/sk-[a-zA-Z0-9]{20,}/)
    expect(serverEnv).not.toMatch(/password123/)
  })
})

describe('webapp template .gitignore', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(join(TEMPLATES_DIR, 'webapp', '.gitignore.tmpl'), 'utf-8')
  })

  it('.gitignore.tmpl exists', () => {
    expect(content).toBeDefined()
  })

  it('excludes node_modules/', () => {
    expect(content).toContain('node_modules/')
  })

  it('excludes dist/', () => {
    expect(content).toContain('dist/')
  })

  it('excludes .env', () => {
    expect(content).toMatch(/^\.env$/m)
  })

  it('excludes .env.local', () => {
    expect(content).toContain('.env.local')
  })

  it('excludes *.db and *.sqlite', () => {
    expect(content).toContain('*.db')
    expect(content).toContain('*.sqlite')
  })

  it('excludes coverage/', () => {
    expect(content).toContain('coverage/')
  })

  it('excludes .DS_Store', () => {
    expect(content).toContain('.DS_Store')
  })
})
