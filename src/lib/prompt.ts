import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Task } from './tasks/schema.js'

export function buildLoopPrompt(projectRoot: string, focusTask: Task | null): string {
  const promptPath = join(projectRoot, '.agent', 'PROMPT.md')
  const base = existsSync(promptPath)
    ? readFileSync(promptPath, 'utf-8')
    : 'You are an autonomous coding agent. Work on the next incomplete task in tasks.json.'

  const taskSection = focusTask
    ? `\n\n## Current Focus Task\nID: ${focusTask.id}\nTitle: ${focusTask.title}\nDescription: ${focusTask.description}\nPass condition: ${focusTask.passCondition}\n\nComplete this task and emit <complete> when done. If you need human input emit <blocked>reason</blocked>. If you need a decision emit <decide>question</decide>.`
    : `\n\nWork on the next incomplete task in .agent/tasks.json. Emit <complete> when done.`

  return `PROJECT_ROOT=${projectRoot}\n\n${base}${taskSection}`
}

export function getDefaultPromptContent(): string {
  return `# Rocket Loop Prompt

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
- Keep changes focused on the current task
`
}
