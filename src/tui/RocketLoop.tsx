import { useState, useEffect, useRef } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { createInterface } from 'readline'
import { type ChildProcess } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AgentBackend } from '../lib/backends/types.js'
import type { Task } from '../lib/tasks/schema.js'
import { getIncompleteTasks } from '../lib/tasks/reader.js'
import { buildLoopPrompt, getDefaultPromptContent } from '../lib/prompt.js'
import { saveIterationHistory } from '../lib/history.js'
import { appendLogEntry } from '../lib/log.js'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from '../lib/backends/tags.js'
import { TaskSelector } from './components/TaskSelector.js'
import { IterationView } from './components/IterationView.js'
import { CompletionReport } from './components/CompletionReport.js'

interface Props {
  projectRoot: string
  projectName: string
  backend: AgentBackend
  tasks: Task[]
  maxIterations: number
  auto?: boolean
}

type Phase = 'selecting' | 'running' | 'done'
type Outcome = 'complete' | 'blocked' | 'decide' | 'max-iterations'

export function RocketLoop({
  projectRoot,
  projectName,
  backend,
  tasks,
  maxIterations,
  auto,
}: Props) {
  const { exit } = useApp()

  const autoTask = auto ? getIncompleteTasks(tasks)[0] ?? null : null
  const [phase, setPhase] = useState<Phase>(auto ? 'running' : 'selecting')
  const [focusTask, setFocusTask] = useState<Task | null>(autoTask)
  const [iteration, setIteration] = useState(1)
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [stepText, setStepText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [iterationElapsedSeconds, setIterationElapsedSeconds] = useState(0)
  const [sessionId, setSessionId] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('max-iterations')
  const [totalMs, setTotalMs] = useState(0)
  const [iterationStats, setIterationStats] = useState<
    Array<{ iteration: number; durationMs: number }>
  >([])
  const [summary, setSummary] = useState('')
  const [blockedReason, setBlockedReason] = useState<string | undefined>()
  const [decideQuestion, setDecideQuestion] = useState<string | undefined>()

  const cancelledRef = useRef(false)
  const processRef = useRef<ChildProcess | null>(null)
  // Capture focusTask in a ref so the loop effect can read the latest value
  const focusTaskRef = useRef<Task | null>(autoTask)
  const iterStartRef = useRef<number>(Date.now())

  useInput((_input, _key) => {
    if (phase === 'done') {
      exit()
    }
  })

  function handleTaskSelect(task: Task | null) {
    focusTaskRef.current = task
    setFocusTask(task)
    setPhase('running')
  }

  // Main loop effect — runs once when phase transitions to 'running'
  useEffect(() => {
    if (phase !== 'running') return

    cancelledRef.current = false

    const sid = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    setSessionId(sid)
    const loopStart = Date.now()
    const stats: Array<{ iteration: number; durationMs: number }> = []

    // Ensure PROMPT.md exists
    const promptPath = join(projectRoot, '.agent', 'PROMPT.md')
    if (!existsSync(promptPath)) {
      writeFileSync(promptPath, getDefaultPromptContent(), 'utf-8')
    }

    // Elapsed seconds timer
    const timer = setInterval(() => {
      if (!cancelledRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - loopStart) / 1000))
        setIterationElapsedSeconds(Math.floor((Date.now() - iterStartRef.current) / 1000))
      }
    }, 1000)

    // Run a single iteration — returns true if an outcome was determined
    function runIteration(iter: number): Promise<boolean> {
      if (cancelledRef.current) return Promise.resolve(false)

      setIteration(iter)
      setOutputLines([])
      setStepText('')
      setIterationElapsedSeconds(0)

      const iterStart = Date.now()
      iterStartRef.current = iterStart
      const currentTask = focusTaskRef.current
      const prompt = buildLoopPrompt(projectRoot, currentTask)
      const accumulatedLines: string[] = []

      return new Promise<boolean>((resolve) => {
        const proc = backend.spawn({ prompt, projectRoot })
        processRef.current = proc

        if (!proc.stdout) {
          processRef.current = null
          resolve(false)
          return
        }

        const rl = createInterface({ input: proc.stdout })

        rl.on('line', (line) => {
          const parsed = backend.parseOutputLine(line)
          if (!parsed) return
          accumulatedLines.push(parsed.text)
          if (!cancelledRef.current) {
            setOutputLines((prev) => [...prev, parsed.text])
            if (parsed.text.trim()) {
              setStepText(parsed.text.slice(0, 100))
            }
          }
        })

        function onClose() {
          processRef.current = null
          rl.close()

          const iterDuration = Date.now() - iterStart
          const fullOutput = accumulatedLines.join('\n')

          saveIterationHistory(projectRoot, sid, iter, fullOutput)

          let exitOutcome: Outcome | null = null
          let exitBlockedReason: string | undefined
          let exitDecideQuestion: string | undefined

          if (hasCompleteTag(fullOutput)) {
            exitOutcome = 'complete'
          } else if (hasBlockedTag(fullOutput)) {
            exitOutcome = 'blocked'
            exitBlockedReason = extractBlockedReason(fullOutput)
          } else if (hasDecideTag(fullOutput)) {
            exitOutcome = 'decide'
            exitDecideQuestion = extractDecideQuestion(fullOutput)
          }

          stats.push({ iteration: iter, durationMs: iterDuration })

          appendLogEntry(
            projectRoot,
            sid,
            iter,
            currentTask?.id ?? null,
            currentTask?.title ?? null,
            exitOutcome ?? 'iteration',
            fullOutput.slice(-300),
            iterDuration,
          )

          if (exitOutcome && !cancelledRef.current) {
            setOutcome(exitOutcome)
            setBlockedReason(exitBlockedReason)
            setDecideQuestion(exitDecideQuestion)
            setSummary(fullOutput.slice(-200))
            setTotalMs(Date.now() - loopStart)
            setIterationStats([...stats])
            setPhase('done')
            resolve(true)
          } else {
            resolve(false)
          }
        }

        proc.on('close', onClose)
        proc.on('error', () => {
          processRef.current = null
          rl.close()
          resolve(false)
        })
      })
    }

    async function runAllIterations() {
      for (let iter = 1; iter <= maxIterations; iter++) {
        if (cancelledRef.current) return
        const isDone = await runIteration(iter)
        if (isDone) return
      }

      // All iterations exhausted without a signal tag
      if (!cancelledRef.current) {
        setOutcome('max-iterations')
        setTotalMs(Date.now() - loopStart)
        setIterationStats([...stats])
        setPhase('done')
      }
    }

    void runAllIterations()

    return () => {
      cancelledRef.current = true
      clearInterval(timer)
      processRef.current?.kill()
      processRef.current = null
    }
  }, [phase])

  if (phase === 'selecting') {
    return (
      <TaskSelector
        tasks={tasks}
        backendName={backend.name}
        projectName={projectName}
        onSelect={handleTaskSelect}
      />
    )
  }

  if (phase === 'running') {
    return (
      <IterationView
        iteration={iteration}
        maxIterations={maxIterations}
        task={focusTask}
        lines={outputLines}
        stepText={stepText}
        elapsedSeconds={elapsedSeconds}
        iterationElapsedSeconds={iterationElapsedSeconds}
        backendName={backend.name}
        projectName={projectName}
        sessionId={sessionId}
      />
    )
  }

  return (
    <Box flexDirection="column">
      <CompletionReport
        outcome={outcome}
        task={focusTask}
        iterations={iteration}
        totalMs={totalMs}
        iterationStats={iterationStats}
        summary={summary}
        blockedReason={blockedReason}
        decideQuestion={decideQuestion}
      />
      <Box marginTop={1}>
        <Text dimColor>Press any key to exit</Text>
      </Box>
    </Box>
  )
}
