import { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Task } from '../lib/tasks/schema.js'
import type { AgentBackend } from '../lib/backends/types.js'
import { TaskSelector } from './components/TaskSelector.js'
import { IterationHeader } from './components/IterationHeader.js'
import { SpinnerPreview } from './components/SpinnerPreview.js'
import { CompletionReport } from './components/CompletionReport.js'
import { BlockedScreen } from './components/BlockedScreen.js'
import { DecideScreen } from './components/DecideScreen.js'
import { useLoopRunner } from './hooks/useLoopRunner.js'
import { formatTime } from './utils/formatTime.js'

export type AppState = 'selecting' | 'running' | 'complete' | 'blocked' | 'decide' | 'all-complete'

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
  projectRoot: string
  agentDir: string
  sessionId: string
  selectTask?: boolean
  caffeinate?: boolean
}

export function RocketLoopApp({
  tasks,
  backend,
  backendName,
  projectName,
  maxIterations,
  projectRoot,
  agentDir,
  sessionId,
  selectTask = false,
  caffeinate,
}: RocketLoopAppProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(
    selectTask ? null : (tasks.find((task) => !task.passes) ?? null),
  )
  const { state: loopState, start, stop, togglePause, skip, paused } = useLoopRunner()
  const { exit } = useApp()

  const phase: AppState =
    selectedTask === null
      ? 'selecting'
      : loopState.phase === 'idle' || loopState.phase === 'running'
        ? 'running'
        : loopState.phase === 'max-reached'
          ? 'complete'
          : loopState.phase === 'all-tasks-complete'
            ? 'all-complete'
            : (loopState.phase as AppState)

  useInput((input) => {
    if (phase !== 'running') return
    if (input === 'q') {
      stop()
      exit()
    }
    if (input === 'p') {
      togglePause()
    }
    if (input === 's') {
      skip()
    }
  })

  useEffect(() => {
    if (selectedTask && loopState.phase === 'idle') {
      start({
        task: selectedTask,
        backend,
        maxIterations,
        projectRoot,
        agentDir,
        caffeinate,
      })
    }
  }, [selectedTask, loopState.phase, start, backend, maxIterations, projectRoot, agentDir, caffeinate])

  function handleTaskSelect(task: Task | null) {
    setSelectedTask(task)
  }

  function handleDecideAnswer() {
    // After a decision, restart the loop
    if (selectedTask) {
      start({
        task: selectedTask,
        backend,
        maxIterations,
        projectRoot,
        agentDir,
        caffeinate,
      })
    }
  }

  const header = (
    <Box marginBottom={1}>
      <Text color="cyan" bold>
        🚀 Rocket Loop
      </Text>
      <Text dimColor>
        {' '}| Project: {projectName} | Backend: {backendName} | Session: {sessionId.slice(0, 8)}
      </Text>
    </Box>
  )

  if (phase === 'selecting') {
    return (
      <Box flexDirection="column">
        {header}
        <TaskSelector
          tasks={tasks}
          backendName={backendName}
          projectName={projectName}
          onSelect={handleTaskSelect}
        />
      </Box>
    )
  }

  if (phase === 'running') {
    const taskId = selectedTask?.id ?? 0
    const lastStats = loopState.iterationStats[loopState.iterationStats.length - 1]
    const lastIterationTiming = lastStats ? formatTime(lastStats.durationMs) : null

    return (
      <Box flexDirection="column">
        {header}
        <IterationHeader n={loopState.currentIteration} max={maxIterations} taskId={taskId} />
        {lastIterationTiming && loopState.currentIteration > 0 && (
          <Text color="yellow">⏱ {lastIterationTiming}</Text>
        )}
        <SpinnerPreview lines={loopState.outputLines} />
        {paused && (
          <Box marginTop={1}>
            <Text color="yellow" bold>
              ⏸ Paused — press p to resume
            </Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>q quit · p pause · s skip</Text>
        </Box>
      </Box>
    )
  }

  if (phase === 'complete') {
    const outcome = loopState.phase === 'max-reached' ? 'max-iterations' : 'complete'
    return (
      <Box flexDirection="column">
        {header}
        <CompletionReport
          outcome={outcome}
          task={selectedTask}
          iterations={loopState.iterations}
          totalMs={loopState.totalMs}
          iterationStats={loopState.iterationStats}
          summary=""
        />
      </Box>
    )
  }

  if (phase === 'blocked') {
    return (
      <Box flexDirection="column">
        {header}
        <BlockedScreen reason={loopState.blockedReason ?? 'Unknown reason'} />
      </Box>
    )
  }

  if (phase === 'all-complete') {
    return (
      <Box flexDirection="column">
        {header}
        <Box paddingX={1}>
          <Text color="green" bold>
            🎉 All tasks complete! Your project is done.
          </Text>
        </Box>
      </Box>
    )
  }

  // phase === 'decide'
  return (
    <Box flexDirection="column">
      {header}
      <DecideScreen
        question={loopState.decideQuestion ?? 'No question provided'}
        agentDir={agentDir}
        onDecide={handleDecideAnswer}
      />
    </Box>
  )
}

export { RocketLoopApp as default }
