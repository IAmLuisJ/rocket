import fs from 'fs-extra'
import { join } from 'path'
import type { AgentBackend } from '../backends/types.js'
import { buildSpecPrompt } from './prompts.js'
import { collectBackendOutput } from './clarifier.js'
import type { NewTask } from './taskMerger.js'

export interface SpecResult {
  specMarkdown: string
  tasks: NewTask[]
}

export async function generateSpec(
  projectRoot: string,
  featureDescription: string,
  qa: { question: string; answer: string }[],
  backend: AgentBackend,
): Promise<SpecResult> {
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  const prdContent = await fs.readFile(prdPath, 'utf-8')
  const prompt = buildSpecPrompt(prdContent, featureDescription, qa)

  const output = await collectBackendOutput(backend, prompt, projectRoot)
  return parseSpecResponse(output, join(projectRoot, '.agent'))
}

export async function parseSpecResponse(output: string, agentDir?: string): Promise<SpecResult> {
  const jsonStr = extractJson(output)

  try {
    const parsed = JSON.parse(jsonStr) as { spec?: string; tasks?: unknown[] }

    if (!parsed.spec || !Array.isArray(parsed.tasks)) {
      throw new Error('Response missing required "spec" or "tasks" fields')
    }

    return {
      specMarkdown: parsed.spec,
      tasks: parsed.tasks as SpecResult['tasks'],
    }
  } catch (err) {
    if (agentDir) {
      const logPath = join(agentDir, 'logs', 'LOG.md')
      await fs.ensureDir(join(agentDir, 'logs'))
      await fs.appendFile(
        logPath,
        `\n## Feature Generation Error\n\`\`\`\n${output}\n\`\`\`\n`,
        'utf-8',
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Could not parse AI response: ${message}. See .agent/logs/LOG.md for raw output.`,
    )
  }
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Try to find a JSON object directly
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) return objMatch[0]

  return text.trim()
}
