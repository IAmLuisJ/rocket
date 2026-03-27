import { createInterface } from 'readline'
import type { AgentBackend } from './backends/types.js'
import type { Task } from './tasks/schema.js'
import { buildLoopPrompt } from './prompt.js'
import { detectComplete, detectBlocked, detectDecide } from './parser/tags.js'
import * as caffeinate from './caffeinate.js'
import { saveIteration } from './history.js'
import { appendSessionLog, type SessionLog } from './log.js'

export type LoopOptions = {
  task: Task
  backend: AgentBackend
  maxIterations: number
  agentDir: string
  onChild?: (proc: import('child_process').ChildProcess) => void
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

  const sessionId = Date.now().toString()
  const loopStartMs = Date.now()
  let outcome: SessionLog['outcome'] = 'max-iterations'
  let completedIterations = 0
  let currentChild: import('child_process').ChildProcess | null = null
  let aborted = false

  const caffProc = caffeinate.start()

  const handleSignal = () => {
    aborted = true
    if (currentChild) {
      try {
        currentChild.kill('SIGTERM')
      } catch {
        /* already exited */
      }
      currentChild = null
    }
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)

  try {
    for (let i = 1; i <= maxIterations; i++) {
      if (aborted) break

      yield { type: 'iteration-start', n: i }

      const prompt = buildLoopPrompt(agentDir, task)
      const startMs = Date.now()

      const child = backend.spawn(prompt, { prompt })
      currentChild = child
      options.onChild?.(child)
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

      currentChild = null

      if (aborted) break

      const elapsedMs = Date.now() - startMs
      yield { type: 'timing', iterationN: i, elapsedMs }

      completedIterations = i

      await saveIteration(agentDir, sessionId, i, accumulated)

      if (detectComplete(accumulated)) {
        outcome = 'complete'
        yield { type: 'complete' }
        return
      }

      const blocked = detectBlocked(accumulated)
      if (blocked) {
        outcome = 'blocked'
        yield { type: 'blocked', reason: blocked.reason }
        return
      }

      const decide = detectDecide(accumulated)
      if (decide) {
        outcome = 'decide'
        yield { type: 'decide', question: decide.question }
        return
      }
    }

    if (!aborted) {
      yield { type: 'max-reached' }
    }
  } finally {
    process.removeListener('SIGINT', handleSignal)
    process.removeListener('SIGTERM', handleSignal)
    if (aborted) {
      outcome = 'error'
    }
    caffeinate.stop(caffProc)
    await appendSessionLog(agentDir, {
      taskId: task.id,
      taskTitle: task.title,
      backend: backend.name,
      iterations: completedIterations,
      outcome,
      elapsedMs: Date.now() - loopStartMs,
      timestamp: new Date(),
    })
  }
}
