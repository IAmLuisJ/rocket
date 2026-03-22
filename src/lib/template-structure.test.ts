import { describe, it, expect } from 'vitest'
import { access } from 'fs/promises'
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
