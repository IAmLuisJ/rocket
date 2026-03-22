import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'

const DB_CONFIG_PATH = join(
  import.meta.dirname,
  '../../templates/website/config/database.php',
)

describe('website template: config/database.php', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(DB_CONFIG_PATH, 'utf-8')
  })

  it('file exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0)
  })

  it('defines a getDB() function returning PDO', () => {
    expect(content).toMatch(/function\s+getDB\(\):\s*PDO/)
  })

  it('uses PDO for database connection', () => {
    expect(content).toContain('new PDO(')
  })

  it('reads DB_HOST from environment', () => {
    expect(content).toContain("getenv('DB_HOST')")
  })

  it('reads DB_NAME from environment', () => {
    expect(content).toContain("getenv('DB_NAME')")
  })

  it('reads DB_USER from environment', () => {
    expect(content).toContain("getenv('DB_USER')")
  })

  it('reads DB_PASS from environment', () => {
    expect(content).toContain("getenv('DB_PASS')")
  })

  it('uses mysql DSN with charset=utf8mb4', () => {
    expect(content).toContain('mysql:host=')
    expect(content).toContain('charset=utf8mb4')
  })

  it('sets ERRMODE_EXCEPTION to throw on errors', () => {
    expect(content).toContain('PDO::ATTR_ERRMODE')
    expect(content).toContain('PDO::ERRMODE_EXCEPTION')
  })

  it('uses static singleton pattern', () => {
    expect(content).toContain('static $pdo = null')
  })

  it('sets default fetch mode to FETCH_ASSOC', () => {
    expect(content).toContain('PDO::ATTR_DEFAULT_FETCH_MODE')
    expect(content).toContain('PDO::FETCH_ASSOC')
  })
})
