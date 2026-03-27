import { createInterface } from 'readline'
import type { AgentBackend } from './backends/types.js'
import type { Task } from './tasks/schema.js'
import { buildLoopPrompt } from './prompt.js'
import { detectComplete, detectBlocked, detectDecide } from './parser/tags.js'
import * as caffeinate from './caffeinate.js'

export type LoopOptions = {
  task: Task
  backend: AgentBackend
  maxIterations: number
  agentDir: string
}

export type LoopEvent =
  | { type: 'iteration-start'; n: number }
  | { type: 'output'; line: string }
  | { type: 'complete' }
  | { type: 'blocked'; reason: string }
  | { type: 'decide'; question: string }
  | { type: 'max-reached' }
  | { type: 'timing'; iterationN: number; elapsedMs: number }

export async function* runLoop(options: LoopOptions): AsyncGenerator<LoopEvent> {
  const { task, backend, maxIterations, agentDir } = options

  const caffProc = caffeinate.start()
  try {
  for (let i = 1; i <= maxIterations; i++) {
    yield { type: 'iteration-start', n: i }

    const prompt = buildLoopPrompt(agentDir, task)
    const startMs = Date.now()

    const child = backend.spawn(prompt, { prompt })
    let accumulated = ''

    if (child.stdout) {
      const rl = createInterface({ input: child.stdout })
      for await (const line of rl) {
        yield { type: 'output', line }
        accumulated += line + '\n'
      }
    }

    await new Promise<void>((resolve, reject) => {
      child.on('error', reject)
      // If the process already exited, resolve immediately
      if (child.exitCode !== null) {
        resolve()
      } else {
        child.on('close', () => resolve())
      }
    })

    const elapsedMs = Date.now() - startMs
    yield { type: 'timing', iterationN: i, elapsedMs }

    if (detectComplete(accumulated)) {
      yield { type: 'complete' }
      return
    }

    const blocked = detectBlocked(accumulated)
    if (blocked) {
      yield { type: 'blocked', reason: blocked.reason }
      return
    }

    const decide = detectDecide(accumulated)
    if (decide) {
      yield { type: 'decide', question: decide.question }
      return
    }
  }

  yield { type: 'max-reached' }
  } finally {
    caffeinate.stop(caffProc)
  }
}
