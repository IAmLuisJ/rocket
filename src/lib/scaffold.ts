import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdir, writeFile, rm } from 'fs/promises'
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
    throw new Error(
      'Project name is empty after sanitization. Use letters, numbers, hyphens, or underscores.',
    )
  }
  return sanitized
}

export type ScaffoldProgress = 'scaffolding' | 'installing' | 'git' | 'done'

export async function scaffold(
  templateName: 'webapp' | 'website',
  projectName: string,
  destPath: string,
  options?: ScaffoldOptions,
  onProgress?: (step: ScaffoldProgress) => void,
): Promise<void> {
  const safeName = sanitizeProjectName(projectName)
  const templateDir = join(getTemplatesDir(), templateName)
  const vars = { PROJECT_NAME: safeName }

  // Step 1: Copy and process template files
  onProgress?.('scaffolding')
  await processTemplate(templateDir, destPath, vars)

  // Post-copy cleanup for feature toggles
  if (options) {
    await removeDisabledFeatureFiles(destPath, options)
  }

  // Create .agent/ structure
  await createAgentStructure(destPath, projectName)

  // Step 2: Run npm install
  onProgress?.('installing')
  try {
    execSync('npm install', { cwd: destPath, stdio: 'inherit' })
  } catch {
    console.error('Warning: npm install failed. You may need to run it manually.')
  }

  // Step 3: Initialize git
  onProgress?.('git')
  execSync('git init', { cwd: destPath, stdio: 'inherit' })
  execSync('git add -A', { cwd: destPath, stdio: 'inherit' })
  execSync('git commit -m "Initial commit from Rocket"', {
    cwd: destPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Rocket',
      GIT_COMMITTER_NAME: 'Rocket',
      GIT_AUTHOR_EMAIL: 'rocket@localhost',
      GIT_COMMITTER_EMAIL: 'rocket@localhost',
    },
  })

  onProgress?.('done')
}

export const featureFiles: Record<keyof ScaffoldOptions, string[]> = {
  auth: ['server/src/middleware/auth.ts', 'server/src/routes/auth.ts', 'server/src/lib/jwt.ts'],
  email: ['server/src/lib/mailer.ts', 'server/src/routes/email.ts'],
  pdf: ['server/src/lib/pdf.ts'],
}

async function removeDisabledFeatureFiles(
  destPath: string,
  options: ScaffoldOptions,
): Promise<void> {
  for (const [feature, files] of Object.entries(featureFiles)) {
    if (options[feature as keyof ScaffoldOptions] === false) {
      for (const file of files) {
        try {
          await rm(join(destPath, file))
        } catch {
          // File may not exist in template — that's fine
        }
      }
    }
  }
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

  await writeFile(join(agentDir, 'tasks.json'), JSON.stringify({ tasks: [] }, null, 2) + '\n')
}
