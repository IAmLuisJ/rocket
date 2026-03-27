import fs from 'fs-extra'
import path from 'path'
import type { Task } from './tasks/schema.js'

const DEFAULT_PROMPT = `# Rocket Loop Prompt

You are an autonomous coding agent working on this project.

## Instructions
1. Read \`.agent/tasks.json\` and find the current focus task (specified below)
2. Implement the task completely, following the pass condition
3. Update \`.agent/tasks.json\` — set \`"passes": true\` for the completed task
4. Emit \`<complete>\` when the task is fully done
5. Emit \`<blocked>reason</blocked>\` if you need human input to continue
6. Emit \`<decide>question</decide>\` if you need a decision before proceeding

## Rules
- Make real code changes, don't just describe them
- Run tests if applicable
- Keep changes focused on the current task`

async function readAgentFile(
  agentDir: string,
  relativePath: string,
  defaultContent = '',
): Promise<string> {
  const fullPath = path.join(agentDir, relativePath)
  try {
    return await fs.readFile(fullPath, 'utf-8')
  } catch {
    return defaultContent
  }
}

export async function buildPrompt(task: Task, agentDir: string): Promise<string> {
  const promptMd = await readAgentFile(agentDir, 'PROMPT.md', DEFAULT_PROMPT)
  const prdMd = await readAgentFile(agentDir, 'prd/PRD.md', '')

  let result = promptMd

  if (prdMd) {
    result += `\n\n---\n\n## Project PRD\n\n${prdMd}`
  }

  result += `\n\n---\n\n## Current Task\n\n**ID**: ${task.id}\n**Title**: ${task.title}\n**Description**: ${task.description}\n**Pass Condition**: ${task.passCondition}`

  return result
}
