import { createAgentStructure } from '../lib/agent-init.js'

export async function runInit(): Promise<void> {
  const projectRoot = process.cwd()

  try {
    await createAgentStructure(projectRoot)
    console.log('✓ Initialized .agent/ structure')
    console.log('  Next: edit .agent/prd/PRD.md and .agent/tasks.json')
    console.log('  Then: rocket loop')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}
