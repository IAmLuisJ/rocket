import { mkdir, writeFile, access } from 'fs/promises'
import { join, dirname } from 'path'

async function writeIfAbsent(filePath: string, content: string): Promise<void> {
  try {
    await access(filePath)
    return // file exists, do not overwrite
  } catch {
    // file does not exist, create it
  }
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
}

const DEFAULT_PRD_MD = `<!-- Edit this file with your project requirements. rocket loop reads this to understand what to build. -->

# Project Name PRD

## Overview
<!-- Describe the purpose and goals of the project -->

Your project overview goes here. Explain what problem this project solves and who it is for.

## Core Features
<!-- List the key features to implement -->

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Technical Requirements
<!-- Describe technical constraints, stack choices, etc. -->

- Runtime: Node.js 22+
- Language: TypeScript
- Add your technical requirements here
`

const DEFAULT_SUMMARY_MD = `# Project Summary

<!-- A brief summary of the project for context -->
`

const DEFAULT_LOG_MD = '# Development Log\n'

const DEFAULT_PROMPT_MD = `# Rocket Loop Prompt

You are an autonomous coding agent working on this project.

## Context
Read \`.agent/prd/PRD.md\` for full project requirements and context.
Read \`.agent/prd/SUMMARY.md\` for a quick overview of the project.

## Your Mission
Read \`.agent/tasks.json\`, find the current focus task, and implement it completely.
Focus only on the current task — do not skip ahead or work on future tasks.

## Exit Tags
When you finish or need help, output exactly one of these tags:

- \`<complete>\` — Output this when the task is fully implemented, tested, and passing. This signals the loop to move to the next task.
- \`<blocked>reason for blockage</blocked>\` — Output this if you are genuinely stuck and need human help. Describe what is blocking you so the user can unblock it.
- \`<decide>question requiring a decision</decide>\` — Output this if you face a design choice or ambiguity that requires human input before you can proceed.

## Available Commands

**rocket feature** — When the user wants to add a new feature or capability, suggest \`rocket feature "<feature description>"\`. It asks clarifying questions, generates a feature spec, and automatically appends implementation tasks to \`.agent/tasks.json\`.

## Code Quality
- Write tests for new functionality
- Avoid over-engineering — keep solutions simple and focused
- Handle errors gracefully
- Commit changes when a logical unit of work is complete

## Rules
1. Make real, working code changes — do not just describe them
2. After completing the task, update \`.agent/tasks.json\` and set \`"passes": true\`
3. Run existing tests to make sure nothing is broken
4. Follow the existing code style and conventions in the project
`

const EMPTY_TASKS_JSON = JSON.stringify({ tasks: [] }, null, 2) + '\n'

export async function createAgentStructure(projectPath: string): Promise<void> {
  const agentDir = join(projectPath, '.agent')

  await mkdir(join(agentDir, 'history'), { recursive: true })

  await writeIfAbsent(join(agentDir, 'prd', 'PRD.md'), DEFAULT_PRD_MD)
  await writeIfAbsent(join(agentDir, 'prd', 'SUMMARY.md'), DEFAULT_SUMMARY_MD)
  await writeIfAbsent(join(agentDir, 'logs', 'LOG.md'), DEFAULT_LOG_MD)
  await writeIfAbsent(join(agentDir, 'PROMPT.md'), DEFAULT_PROMPT_MD)
  await writeIfAbsent(join(agentDir, 'tasks.json'), EMPTY_TASKS_JSON)
}
