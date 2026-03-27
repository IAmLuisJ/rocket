import { createInterface } from 'readline'
import { access } from 'fs/promises'
import { join } from 'path'
import { createAgentStructure } from '../lib/agent-init.js'

const CREATED_FILES = [
  '.agent/prd/PRD.md',
  '.agent/prd/SUMMARY.md',
  '.agent/logs/LOG.md',
  '.agent/history/',
  '.agent/PROMPT.md',
  '.agent/tasks.json',
]

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => rl.question(message, resolve))
  rl.close()
  return answer.trim().toLowerCase() === 'y'
}

export async function runInit(): Promise<void> {
  const projectRoot = process.cwd()
  const agentDir = join(projectRoot, '.agent')

  let exists = false
  try {
    await access(agentDir)
    exists = true
  } catch {
    // directory does not exist
  }

  if (exists) {
    const proceed = await confirm('.agent/ already exists. Proceed? (y/N) ')
    if (!proceed) {
      console.log('Aborted.')
      return
    }
  }

  try {
    await createAgentStructure(projectRoot)
    console.log('✓ Initialized .agent/ structure')
    console.log('')
    console.log('Created:')
    for (const file of CREATED_FILES) {
      console.log(`  ${file}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}
