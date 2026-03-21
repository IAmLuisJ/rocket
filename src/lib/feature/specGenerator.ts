import { readFileSync } from 'fs'
import { join } from 'path'
import type { AgentBackend } from '../backends/types.js'
import { buildSpecPrompt } from './prompts.js'
import { collectBackendOutput } from './clarifier.js'

export interface SpecResult {
  specMarkdown: string
  tasks: Array<{
    title: string
    description: string
    category: string
    passes: boolean
    passCondition: string
  }>
}

export async function generateSpec(
  projectRoot: string,
  featureDescription: string,
  qa: { question: string; answer: string }[],
  backend: AgentBackend,
): Promise<SpecResult> {
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  const prdContent = readFileSync(prdPath, 'utf-8')
  const prompt = buildSpecPrompt(prdContent, featureDescription, qa)

  const output = await collectBackendOutput(backend, prompt, projectRoot)

  // Try to extract JSON from the output — it may be wrapped in markdown fences
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
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to parse AI response as JSON: ${message}\n\nRaw output:\n${output.slice(0, 500)}`,
    )
  }
}

function extractJson(text: string): string {
  // Try to find JSON within markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Try to find a JSON object directly
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) return objMatch[0]

  return text.trim()
}
