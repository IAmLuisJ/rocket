import { mkdir, writeFile, access } from 'fs/promises'
import { join } from 'path'

export async function createAgentStructure(projectRoot: string): Promise<void> {
  const agentDir = join(projectRoot, '.agent')

  // Check if already initialized
  try {
    await access(join(agentDir, 'tasks.json'))
    throw new Error('.agent/ already exists. Use rocket loop to start the development loop.')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  await mkdir(join(agentDir, 'prd'), { recursive: true })
  await mkdir(join(agentDir, 'logs'), { recursive: true })
  await mkdir(join(agentDir, 'history'), { recursive: true })

  await writeFile(
    join(agentDir, 'prd', 'PRD.md'),
    `# Product Requirements Document

## Overview
<!-- Describe the purpose and goals of the project -->

## Features
<!-- List the key features to implement -->

## Technical Requirements
<!-- Describe technical constraints, stack choices, etc. -->
`,
  )

  await writeFile(
    join(agentDir, 'prd', 'SUMMARY.md'),
    `# Project Summary

<!-- A brief summary of the project for context -->
`,
  )

  await writeFile(join(agentDir, 'logs', 'LOG.md'), '# Development Log\n')

  await writeFile(
    join(agentDir, 'PROMPT.md'),
    `# Rocket Loop Prompt

You are an autonomous coding agent working on this project.

## Your mission
Read \`.agent/tasks.json\`, find the current focus task, and implement it completely.

## Rules
1. Make real, working code changes — do not just describe them
2. After completing the task, update \`.agent/tasks.json\` and set \`"passes": true\`
3. Emit \`<complete>\` when the task is fully done
4. Emit \`<blocked>reason</blocked>\` if you are genuinely stuck and need human input
5. Emit \`<decide>question</decide>\` if you need a decision before proceeding
`,
  )

  await writeFile(
    join(agentDir, 'tasks.json'),
    JSON.stringify({ tasks: [] }, null, 2) + '\n',
  )
}
