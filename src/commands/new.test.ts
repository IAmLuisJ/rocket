import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRender = vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() })

vi.mock('ink', () => ({
  render: (...args: unknown[]) => mockRender(...args),
}))

vi.mock('../tui/components/NewProjectWizard.js', () => ({
  NewProjectWizard: vi.fn(),
}))

describe('runNew command handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders NewProjectWizard with initialName when project name is provided', async () => {
    const { runNew } = await import('./new.js')
    await runNew('my-app', {})

    expect(mockRender).toHaveBeenCalledOnce()
    const element = mockRender.mock.calls[0][0]
    expect(element.props.initialName).toBe('my-app')
    expect(element.props.initialType).toBeUndefined()
  })

  it('renders NewProjectWizard with undefined initialName when no project name given', async () => {
    const { runNew } = await import('./new.js')
    await runNew(undefined, {})

    expect(mockRender).toHaveBeenCalledOnce()
    const element = mockRender.mock.calls[0][0]
    expect(element.props.initialName).toBeUndefined()
  })

  it('passes initialType when --type option is provided', async () => {
    const { runNew } = await import('./new.js')
    await runNew('my-app', { type: 'webapp' })

    const element = mockRender.mock.calls[0][0]
    expect(element.props.initialName).toBe('my-app')
    expect(element.props.initialType).toBe('webapp')
  })

  it('awaits waitUntilExit from ink render', async () => {
    let resolved = false
    let resolveExit: () => void
    const exitPromise = new Promise<void>((r) => {
      resolveExit = r
    })
    mockRender.mockReturnValueOnce({ waitUntilExit: () => exitPromise })

    const { runNew } = await import('./new.js')
    const p = runNew('test', {}).then(() => {
      resolved = true
    })
    expect(resolved).toBe(false)

    resolveExit!()
    await p
    expect(resolved).toBe(true)
  })
})

describe('rocket new CLI registration', () => {
  it('new command accepts optional project-name argument', async () => {
    const { program } = await import('../cli.js')
    const newCmd = program.commands.find((c) => c.name() === 'new')
    expect(newCmd).toBeDefined()
    const helpText = newCmd!.helpInformation()
    expect(helpText).toContain('project-name')
  })

  it('new command has --type option', async () => {
    const { program } = await import('../cli.js')
    const newCmd = program.commands.find((c) => c.name() === 'new')
    expect(newCmd).toBeDefined()
    const helpText = newCmd!.helpInformation()
    expect(helpText).toContain('--type')
    expect(helpText).toContain('-t')
  })
})
