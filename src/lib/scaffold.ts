import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdir, writeFile } from 'fs/promises'
import { execSync } from 'child_process'
import { processTemplate } from './template-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getTemplatesDir(): string {
  return join(__dirname, '../../templates')
}

export interface ScaffoldOptions {
  auth?: boolean
  email?: boolean
  pdf?: boolean
}

export function sanitizeProjectName(name: string): string {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
  if (!sanitized) {
    throw new Error('Project name is empty after sanitization. Use letters, numbers, hyphens, or underscores.')
  }
  return sanitized
}

export async function scaffold(
  templateName: string,
  projectName: string,
  destPath: string,
  _options?: ScaffoldOptions,
): Promise<void> {
  const safeName = sanitizeProjectName(projectName)
  const templateDir = join(getTemplatesDir(), templateName)
  const vars = { PROJECT_NAME: safeName }

  // Copy and process template files
  await processTemplate(templateDir, destPath, vars)

  // Create .agent/ structure
  await createAgentStructure(destPath, projectName)

  // Run npm install
  execSync('npm install', { cwd: destPath, stdio: 'pipe' })

  // Initialize git
  execSync('git init', { cwd: destPath, stdio: 'pipe' })
  execSync('git add -A', { cwd: destPath, stdio: 'pipe' })
  execSync('git commit -m "Initial scaffold from rocket new"', {
    cwd: destPath,
    stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_NAME: 'Rocket', GIT_COMMITTER_NAME: 'Rocket', GIT_AUTHOR_EMAIL: 'rocket@localhost', GIT_COMMITTER_EMAIL: 'rocket@localhost' },
  })
}

async function createAgentStructure(projectPath: string, projectName: string): Promise<void> {
  const agentDir = join(projectPath, '.agent')

  await mkdir(join(agentDir, 'prd'), { recursive: true })
  await mkdir(join(agentDir, 'logs'), { recursive: true })
  await mkdir(join(agentDir, 'history'), { recursive: true })

  await writeFile(
    join(agentDir, 'prd', 'PRD.md'),
    `# ${projectName} — Product Requirements Document

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
    `# ${projectName} — Summary

<!-- A brief summary of the project for context -->
`,
  )

  await writeFile(join(agentDir, 'logs', 'LOG.md'), '# Development Log\n')

  await writeFile(
    join(agentDir, 'PROMPT.md'),
    `# Rocket Loop Prompt

You are an autonomous coding agent working on the ${projectName} project.

## Your mission
Read \`.agent/tasks.json\`, find the current focus task (specified below), and implement it completely.

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
