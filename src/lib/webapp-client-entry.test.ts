import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const TEMPLATES = resolve(import.meta.dirname, '../../templates/webapp/client')

describe('TASK-25: webapp client entry point and App.tsx', () => {
  it('main.tsx exists', () => {
    expect(existsSync(resolve(TEMPLATES, 'src/main.tsx'))).toBe(true)
  })

  it('main.tsx imports QueryClientProvider from @tanstack/react-query', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/main.tsx'), 'utf-8')
    expect(content).toContain("from '@tanstack/react-query'")
    expect(content).toContain('QueryClientProvider')
  })

  it('main.tsx imports RouterProvider from react-router-dom', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/main.tsx'), 'utf-8')
    expect(content).toContain("from 'react-router-dom'")
    expect(content).toContain('RouterProvider')
  })

  it('main.tsx imports createBrowserRouter', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/main.tsx'), 'utf-8')
    expect(content).toContain('createBrowserRouter')
  })

  it('App.tsx exists', () => {
    expect(existsSync(resolve(TEMPLATES, 'src/App.tsx'))).toBe(true)
  })

  it('App.tsx contains {{PROJECT_NAME}} placeholder', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/App.tsx'), 'utf-8')
    expect(content).toContain('{{PROJECT_NAME}}')
  })

  it('App.tsx is a default export', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/App.tsx'), 'utf-8')
    expect(content).toContain('export default function App')
  })

  it('index.css exists with Tailwind import', () => {
    const content = readFileSync(resolve(TEMPLATES, 'src/index.css'), 'utf-8')
    expect(content).toContain("@import 'tailwindcss'")
  })

  it('index.html exists with Vite entry', () => {
    const content = readFileSync(resolve(TEMPLATES, 'index.html'), 'utf-8')
    expect(content).toContain('{{PROJECT_NAME}}')
    expect(content).toContain('div id="root"')
    expect(content).toContain('src="/src/main.tsx"')
    expect(content).toContain('type="module"')
  })
})
