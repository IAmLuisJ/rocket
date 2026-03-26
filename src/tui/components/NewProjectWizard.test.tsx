import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { NewProjectWizard } from './NewProjectWizard.js'

vi.mock('../../lib/scaffold.js', () => ({
  scaffold: vi.fn().mockResolvedValue(undefined),
}))

describe('NewProjectWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders name input when no initialName is provided', () => {
    const { lastFrame } = render(<NewProjectWizard />)
    const frame = lastFrame()
    expect(frame).toContain('Rocket — New Project')
    expect(frame).toContain('Project name:')
  })

  it('skips name step when initialName is provided', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" />)
    const frame = lastFrame()
    expect(frame).toContain('Select project type:')
    expect(frame).toContain('Web App (React + Express)')
    expect(frame).toContain('Website (PHP + MySQL)')
  })

  it('shows project name in type selection step', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" />)
    const frame = lastFrame()
    expect(frame).toContain('my-app')
  })

  it('skips to features step when both initialName and initialType are provided', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" initialType="webapp" />)
    const frame = lastFrame()
    expect(frame).toContain('Feature toggles:')
    expect(frame).toContain('Authentication (JWT + bcrypt)')
    expect(frame).toContain('Email (Nodemailer)')
    expect(frame).toContain('PDF Renderer')
  })

  it('renders project type selection with SelectInput items', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="test-proj" />)
    const frame = lastFrame()
    expect(frame).toContain('Web App (React + Express)')
    expect(frame).toContain('Website (PHP + MySQL)')
  })

  it('shows feature toggles with auth enabled by default', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" initialType="webapp" />)
    const frame = lastFrame()
    // auth defaults to true (✓), email and pdf default to false (✗)
    expect(frame).toContain('✓')
    expect(frame).toContain('✗')
  })

  it('shows Continue option in feature toggles', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" initialType="webapp" />)
    const frame = lastFrame()
    expect(frame).toContain('Continue →')
  })

  it('displays project type info in features step', () => {
    const { lastFrame } = render(<NewProjectWizard initialName="my-app" initialType="webapp" />)
    const frame = lastFrame()
    expect(frame).toContain('my-app')
    expect(frame).toContain('webapp')
  })
})
