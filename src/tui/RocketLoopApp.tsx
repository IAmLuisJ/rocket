import { useState } from 'react'
import { Box } from 'ink'
import type { Task } from '../lib/tasks/schema.js'
import { TaskSelector } from './components/TaskSelector.js'
import { IterationHeader } from './components/IterationHeader.js'
import { SpinnerPreview } from './components/SpinnerPreview.js'
import { CompletionReport } from './components/CompletionReport.js'
import { BlockedScreen } from './components/BlockedScreen.js'
import { DecideScreen } from './components/DecideScreen.js'

export type AppState = 'selecting' | 'running' | 'complete' | 'blocked' | 'decide'

export interface IterationStats {
  iteration: number
  durationMs: number
}

interface StateData {
  phase: AppState
  selectedTask: Task | null
  currentIteration: number
  outputLines: string[]
  iterations: number
  totalMs: number
  iterationStats: IterationStats[]
  summary: string
  blockedReason?: string
  decideQuestion?: string
}

export interface RocketLoopAppProps {
  tasks: Task[]
  backendName: string
  projectName: string
  maxIterations: number
  agentDir: string
}

export function RocketLoopApp({
  tasks,
  backendName,
  projectName,
  maxIterations,
  agentDir,
}: RocketLoopAppProps) {
  const [data, setData] = useState<StateData>({
    phase: 'selecting',
    selectedTask: null,
    currentIteration: 1,
    outputLines: [],
    iterations: 0,
    totalMs: 0,
    iterationStats: [],
    summary: '',
  })

  function handleTaskSelect(task: Task | null) {
    setData((prev) => ({ ...prev, phase: 'running' as const, selectedTask: task }))
  }

  function handleDecideAnswer(_answer: string) {
    setData((prev) => ({ ...prev, phase: 'running' as const }))
  }

  if (data.phase === 'selecting') {
    return (
      <TaskSelector
        tasks={tasks}
        backendName={backendName}
        projectName={projectName}
        onSelect={handleTaskSelect}
      />
    )
  }

  if (data.phase === 'running') {
    const taskId = data.selectedTask?.id ?? 0
    return (
      <Box flexDirection="column">
        <IterationHeader n={data.currentIteration} max={maxIterations} taskId={taskId} />
        <SpinnerPreview lines={data.outputLines} />
      </Box>
    )
  }

  if (data.phase === 'complete') {
    return (
      <CompletionReport
        outcome="complete"
        task={data.selectedTask}
        iterations={data.iterations}
        totalMs={data.totalMs}
        iterationStats={data.iterationStats}
        summary={data.summary}
      />
    )
  }

  if (data.phase === 'blocked') {
    return <BlockedScreen reason={data.blockedReason ?? 'Unknown reason'} />
  }

  // phase === 'decide'
  return (
    <DecideScreen
      question={data.decideQuestion ?? 'No question provided'}
      agentDir={agentDir}
      onDecide={handleDecideAnswer}
    />
  )
}

export { RocketLoopApp as default }
