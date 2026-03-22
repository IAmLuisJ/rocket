import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'

const SERVER_ENTRY = join(import.meta.dirname, '../../templates/webapp/server/src/index.ts')

describe('webapp template server entry point', () => {
  let content: string

  beforeAll(async () => {
    content = await readFile(SERVER_ENTRY, 'utf-8')
  })

  it('imports express', () => {
    expect(content).toContain("import express from 'express'")
  })

  it('imports cors', () => {
    expect(content).toContain("import cors from 'cors'")
  })

  it('creates an Express app', () => {
    expect(content).toContain('express()')
  })

  it('uses JSON middleware', () => {
    expect(content).toContain('express.json()')
  })

  it('uses CORS middleware with configurable origin', () => {
    expect(content).toContain('app.use(cors(')
    expect(content).toContain('CLIENT_URL')
    expect(content).toContain('http://localhost:5173')
  })

  it('has GET /api/health returning status ok', () => {
    expect(content).toContain("app.get('/api/health'")
    expect(content).toContain("status: 'ok'")
  })

  it('listens on PORT env var with default 3001', () => {
    expect(content).toContain('process.env.PORT')
    expect(content).toContain('3001')
  })

  it('exports the app as default', () => {
    expect(content).toContain('export default app')
  })
})
