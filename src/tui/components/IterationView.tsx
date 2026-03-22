import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import type { Task } from '../../lib/tasks/schema.js'

interface Props {
  iteration: number
  maxIterations: number
  task: Task | null
  lines: string[]
  stepText: string
  elapsedSeconds: number
  iterationElapsedSeconds: number
  backendName: string
  projectName: string
  sessionId: string
}

const BORDER = '░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░'

export function IterationView({
  iteration,
  maxIterations,
  task,
  lines,
  stepText,
  elapsedSeconds,
  iterationElapsedSeconds,
  backendName,
  projectName,
  sessionId,
}: Props) {
  const taskLabel = task ? `Task #${task.id}: ${task.title.slice(0, 40)}` : 'Auto'
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const elapsed = `${minutes}m ${seconds}s`
  const iterSec = iterationElapsedSeconds
  const iterTime = iterSec >= 60 ? `${Math.floor(iterSec / 60)}m ${iterSec % 60}s` : `${iterSec}s`
  const preview = lines.slice(-4)

  return (
    <Box flexDirection="column">
      <Text>
        {'  '}
        <Text color="cyan" bold>
          Rocket Loop
        </Text>
        <Text dimColor>
          {' | Project: '}
          {projectName}
          {' | Backend: '}
          {backendName}
          {sessionId ? ` | Session: ${sessionId.slice(0, 8)}` : ''}
        </Text>
      </Text>
      <Text color="blue">{BORDER}</Text>
      <Text>
        {'  ↪ '}
        <Text color="yellow">Iteration {iteration}</Text>
        {' of '}
        <Text color="yellow">{maxIterations}</Text>
        {'  ·  '}
        <Text color="cyan">{taskLabel}</Text>
        {'  ·  '}
        <Text dimColor>{elapsed}</Text>
      </Text>
      <Text color="yellow">
        {'  ⏱ '}
        {iterTime}
      </Text>
      <Text color="blue">{BORDER}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> {stepText || 'Working...'}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {preview.map((line, i) => (
          <Text key={i} dimColor>
            {line.slice(0, 100)}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
