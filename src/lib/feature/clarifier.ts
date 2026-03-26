import { readFileSync } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'
import type { AgentBackend } from '../backends/types.js'
import { buildClarifierPrompt, SEED_QUESTIONS } from './prompts.js'

export async function generateClarifyingQuestions(
  projectRoot: string,
  featureDescription: string,
  backend: AgentBackend,
): Promise<string[]> {
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  const prdContent = readFileSync(prdPath, 'utf-8')
  const prompt = buildClarifierPrompt(prdContent, featureDescription)

  try {
    const output = await collectBackendOutput(backend, prompt, projectRoot)
    const questions = JSON.parse(output) as unknown

    if (Array.isArray(questions) && questions.every((q) => typeof q === 'string')) {
      return questions as string[]
    }

    return SEED_QUESTIONS
  } catch {
    return SEED_QUESTIONS
  }
}

async function collectBackendOutput(
  backend: AgentBackend,
  prompt: string,
  projectRoot: string,
): Promise<string> {
  const proc = backend.spawn(prompt, { prompt, cwd: projectRoot })

  if (!proc.stdout) {
    throw new Error('Backend process has no stdout')
  }

  const lines: string[] = []
  const rl = createInterface({ input: proc.stdout })

  return new Promise<string>((resolve, reject) => {
    rl.on('line', (line) => {
      const parsed = backend.parseOutput(line)
      if (parsed) lines.push(parsed.type === 'text' ? parsed.content : line)
    })

    proc.on('close', () => {
      rl.close()
      resolve(lines.join('\n'))
    })

    proc.on('error', (err) => {
      rl.close()
      reject(err)
    })
  })
}

export { collectBackendOutput }
