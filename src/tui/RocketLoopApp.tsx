import { useState, useEffect } from 'react'
import { Box } from 'ink'
import type { Task } from '../lib/tasks/schema.js'
import type { AgentBackend } from '../lib/backends/types.js'
import { TaskSelector } from './components/TaskSelector.js'
import { IterationHeader } from './components/IterationHeader.js'
import { SpinnerPreview } from './components/SpinnerPreview.js'
import { CompletionReport } from './components/CompletionReport.js'
import { BlockedScreen } from './components/BlockedScreen.js'
import { DecideScreen } from './components/DecideScreen.js'
import { useLoopRunner } from './hooks/useLoopRunner.js'

export type AppState = 'selecting' | 'running' | 'complete' | 'blocked' | 'decide'

export interface IterationStats {
  iteration: number
  durationMs: number
}

export interface RocketLoopAppProps {
  tasks: Task[]
  backend: AgentBackend
  backendName: string
  projectName: string
  maxIterations: number
  agentDir: string
}

export function RocketLoopApp({
  tasks,
  backend,
  backendName,
  projectName,
  maxIterations,
  agentDir,
}: RocketLoopAppProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { state: loopState, start } = useLoopRunner()

  const phase: AppState =
    selectedTask === null
      ? 'selecting'
      : loopState.phase === 'idle' || loopState.phase === 'running'
        ? 'running'
        : loopState.phase === 'max-reached'
          ? 'complete'
          : (loopState.phase as AppState)

  useEffect(() => {
    if (selectedTask && loopState.phase === 'idle') {
      start({
        task: selectedTask,
        backend,
        maxIterations,
        agentDir,
      })
    }
  }, [selectedTask, loopState.phase, start, backend, maxIterations, agentDir])

  function handleTaskSelect(task: Task | null) {
    setSelectedTask(task)
  }

  function handleDecideAnswer(_answer: string) {
    // After a decision, restart the loop
    if (selectedTask) {
      start({
        task: selectedTask,
        backend,
        maxIterations,
        agentDir,
      })
    }
  }

  if (phase === 'selecting') {
    return (
      <TaskSelector
        tasks={tasks}
        backendName={backendName}
        projectName={projectName}
        onSelect={handleTaskSelect}
      />
    )
  }

  if (phase === 'running') {
    const taskId = selectedTask?.id ?? 0
    return (
      <Box flexDirection="column">
        <IterationHeader n={loopState.currentIteration} max={maxIterations} taskId={taskId} />
        <SpinnerPreview lines={loopState.outputLines} />
      </Box>
    )
  }

  if (phase === 'complete') {
    const outcome = loopState.phase === 'max-reached' ? 'max-iterations' : 'complete'
    return (
      <CompletionReport
        outcome={outcome}
        task={selectedTask}
        iterations={loopState.iterations}
        totalMs={loopState.totalMs}
        iterationStats={loopState.iterationStats}
        summary=""
      />
    )
  }

  if (phase === 'blocked') {
    return <BlockedScreen reason={loopState.blockedReason ?? 'Unknown reason'} />
  }

  // phase === 'decide'
  return (
    <DecideScreen
      question={loopState.decideQuestion ?? 'No question provided'}
      agentDir={agentDir}
      onDecide={handleDecideAnswer}
    />
  )
}

export { RocketLoopApp as default }
