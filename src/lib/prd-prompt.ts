import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getSkillDir(): string {
  return join(__dirname, '../../.claude/skills/prd-creator')
}

export function buildPrdPrompt(description: string, projectRoot: string): string {
  const skillDir = getSkillDir()
  const skillContent = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')
  const prdGuide = readFileSync(join(skillDir, 'PRD.md'), 'utf-8')
  const jsonGuide = readFileSync(join(skillDir, 'JSON.md'), 'utf-8')

  return `PROJECT_ROOT=${projectRoot}

You are initializing a PRD for a new software project. The user has provided this description:

---
${description}
---

Follow the prd-creator skill instructions below to create all three outputs in one pass:

1. A comprehensive PRD saved to ${projectRoot}/.agent/prd/PRD.md
2. A project summary saved to ${projectRoot}/.agent/prd/SUMMARY.md
3. A complete implementation task list saved to ${projectRoot}/.agent/tasks.json
   - Each individual task spec saved to ${projectRoot}/.agent/tasks/TASK-<ID>.json

Do not ask the user clarifying questions — generate everything from the description provided, making reasonable assumptions where details are missing and noting them in the PRD's Assumptions section.

## Skill Instructions

${skillContent}

## PRD Creation Guide

${prdGuide}

## Task Generation Guide

${jsonGuide}

## Completion

After all files are written, emit: <complete>
`
}
