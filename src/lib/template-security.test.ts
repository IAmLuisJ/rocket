import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { glob } from 'glob'

const WEBAPP_DIR = join(import.meta.dirname, '../../templates/webapp')
const WEBSITE_DIR = join(import.meta.dirname, '../../templates/website')

/**
 * Patterns that indicate a hardcoded secret value.
 * Each pattern uses a negative lookahead to allow known placeholder values
 * like "your-...-here", "change-me", or empty/env-ref values.
 */
const SECRET_PATTERNS = [
  // password = 'literal' or password = "literal" (not placeholder text)
  /(?:password|passwd)\s*[:=]\s*['"](?!your-|change[-_]me|<|CHANGE|TODO|example|placeholder|smtp\.)\w+['"]/i,
  // Inline password in connection strings: ://<user>:<password>@
  /:\/\/\w+:(?!your-|change[-_]me|<|CHANGE|TODO|example|placeholder)\w+@/i,
  // JWT_SECRET or API_KEY with a literal value (not placeholder text)
  /(?:JWT_SECRET|API_KEY|APIKEY|SECRET_KEY)\s*[:=]\s*['"](?!your-|change[-_]me|<|CHANGE|TODO|example|placeholder)[A-Za-z0-9+/=]{8,}['"]/i,
]

// Patterns allowed in .env.example files (placeholder text)
const PLACEHOLDER_ALLOWLIST = [/your[-_]/i, /change[-_]me/i, /example\.com/i, /placeholder/i]

function isPlaceholder(line: string): boolean {
  return PLACEHOLDER_ALLOWLIST.some((p) => p.test(line))
}

describe('webapp template security — no hardcoded credentials', () => {
  it('source files contain no hardcoded secrets', async () => {
    const files = await glob('**/*.{ts,tsx,js,json,yml,yaml}', {
      cwd: WEBAPP_DIR,
      nodir: true,
      ignore: ['**/node_modules/**'],
    })

    const violations: string[] = []

    for (const rel of files) {
      const abs = join(WEBAPP_DIR, rel)
      const content = await readFile(abs, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Skip comment-only lines
        if (/^\s*(\/\/|#|\/\*)/.test(line)) continue

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(line) && !isPlaceholder(line)) {
            violations.push(`${rel}:${i + 1} → ${line.trim()}`)
          }
        }
      }
    }

    expect(violations, `Hardcoded secrets found:\n${violations.join('\n')}`).toEqual([])
  })

  it('.env.example files use only placeholder values for secrets', async () => {
    const envFiles = await glob('**/.env.example', {
      cwd: WEBAPP_DIR,
      nodir: true,
    })

    const violations: string[] = []

    for (const rel of envFiles) {
      const abs = join(WEBAPP_DIR, rel)
      const content = await readFile(abs, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim() || line.startsWith('#')) continue

        // Check secret-like keys have placeholder values
        const match = line.match(
          /^(JWT_SECRET|SECRET_KEY|API_KEY|POSTGRES_PASSWORD|DB_PASSWORD|SMTP_PASS)\s*=\s*(.+)/i,
        )
        if (match) {
          const value = match[2].trim()
          if (!isPlaceholder(value)) {
            violations.push(`${rel}:${i + 1} → ${line.trim()}`)
          }
        }

        // Check for inline passwords in connection strings
        const connMatch = line.match(/:\/\/\w+:([^@]+)@/)
        if (connMatch) {
          const pw = connMatch[1]
          if (!isPlaceholder(pw)) {
            violations.push(`${rel}:${i + 1} → connection string contains non-placeholder password`)
          }
        }
      }
    }

    expect(
      violations,
      `Non-placeholder secrets in .env.example:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('no process.env fallback to hardcoded secret in source files', async () => {
    const files = await glob('**/*.{ts,tsx,js}', {
      cwd: WEBAPP_DIR,
      nodir: true,
      ignore: ['**/node_modules/**'],
    })

    const violations: string[] = []
    const fallbackPattern = /process\.env\.\w+\s*\|\|\s*['"][^'"]{4,}['"]/

    for (const rel of files) {
      const abs = join(WEBAPP_DIR, rel)
      const content = await readFile(abs, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/^\s*(\/\/|#)/.test(line)) continue
        if (fallbackPattern.test(line) && /secret|key|password|token/i.test(line)) {
          violations.push(`${rel}:${i + 1} → ${line.trim()}`)
        }
      }
    }

    expect(
      violations,
      `Source files with hardcoded secret fallbacks:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

describe('website template security — no hardcoded credentials', () => {
  it('config/database.php uses getenv() for all credentials and has no fallback for user/pass', async () => {
    const content = await readFile(join(WEBSITE_DIR, 'config/database.php'), 'utf-8')

    // Must use getenv() for all DB_* vars
    expect(content).toContain("getenv('DB_HOST')")
    expect(content).toContain("getenv('DB_NAME')")
    expect(content).toContain("getenv('DB_USER')")
    expect(content).toContain("getenv('DB_PASS')")

    // DB_USER and DB_PASS must NOT have ?: fallback defaults
    expect(content).not.toMatch(/getenv\('DB_USER'\)\s*\?:\s*'/)
    expect(content).not.toMatch(/getenv\('DB_PASS'\)\s*\?:\s*'/)
  })

  it('PHP template files contain no hardcoded passwords or credentials', async () => {
    const files = await glob('**/*.php', {
      cwd: WEBSITE_DIR,
      nodir: true,
    })

    const violations: string[] = []
    const credentialPatterns = [
      // password = 'literal' (not placeholder text)
      /(?:password|passwd)\s*[:=]\s*['"](?!your[-_]|change[-_]me|<|CHANGE|TODO|example|placeholder)\w+['"]/i,
      // Inline password in connection strings
      /:\/\/\w+:(?!your[-_]|change[-_]me|<|CHANGE|TODO|example|placeholder)\w+@/i,
    ]

    for (const rel of files) {
      const abs = join(WEBSITE_DIR, rel)
      const content = await readFile(abs, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/^\s*(\/\/|#|\/\*)/.test(line)) continue

        for (const pattern of credentialPatterns) {
          if (pattern.test(line) && !isPlaceholder(line)) {
            violations.push(`${rel}:${i + 1} → ${line.trim()}`)
          }
        }
      }
    }

    expect(violations, `Hardcoded secrets found:\n${violations.join('\n')}`).toEqual([])
  })

  it('.env.example uses only placeholder values for DB credentials', async () => {
    const content = await readFile(join(WEBSITE_DIR, '.env.example'), 'utf-8')
    const lines = content.split('\n')

    const violations: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim() || line.startsWith('#')) continue

      const match = line.match(/^(DB_PASS|DB_USER|DB_NAME)\s*=\s*(.+)/i)
      if (match) {
        const value = match[2].trim()
        if (!isPlaceholder(value)) {
          violations.push(`line ${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(
      violations,
      `Non-placeholder secrets in .env.example:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
