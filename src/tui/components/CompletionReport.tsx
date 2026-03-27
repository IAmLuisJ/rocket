import { Box, Text } from 'ink'
import type { Task } from '../../lib/tasks/schema.js'

interface IterationStats {
  iteration: number
  durationMs: number
}

interface Props {
  outcome: 'complete' | 'blocked' | 'decide' | 'max-iterations'
  task: Task | null
  iterations: number
  totalMs: number
  iterationStats: IterationStats[]
  summary: string
  blockedReason?: string
  decideQuestion?: string
}

function formatMs(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const BORDER = '░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░'

export function CompletionReport({
  outcome,
  task,
  iterations,
  totalMs,
  iterationStats,
  summary,
  blockedReason,
  decideQuestion,
}: Props) {
  const avgMs = iterationStats.length > 0 ? totalMs / iterationStats.length : 0
  const taskLabel = task ? `#${task.id} · ${task.title}` : 'Auto'

  if (outcome === 'complete') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="green">{BORDER}</Text>
        <Text>
          {'  🎉 '}
          <Text color="green" bold>
            Task complete!
          </Text>
        </Text>
        <Text>
          {'  ✅ Task: '}
          <Text color="cyan">{taskLabel}</Text>
        </Text>
        <Text>
          {'  ⚡ Finished in '}
          <Text color="yellow">{iterations}</Text>
          {` iteration${iterations !== 1 ? 's' : ''}`}
        </Text>
        <Text>
          {'  ⏱  Total: '}
          <Text color="yellow">{formatMs(totalMs)}</Text>
          {'  ·  Avg: '}
          <Text color="yellow">{formatMs(avgMs)}</Text>
        </Text>
        {iterationStats.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>{'  Per-iteration timing:'}</Text>
            {iterationStats.map((s) => (
              <Text key={s.iteration}>
                {'    Iteration '}
                {s.iteration}
                {': '}
                <Text color="yellow">{formatMs(s.durationMs)}</Text>
              </Text>
            ))}
          </Box>
        ) : null}
        {summary ? (
          <Text>
            {'  📋 '}
            <Text dimColor>{summary.slice(0, 200)}</Text>
          </Text>
        ) : null}
        <Text dimColor>{'  Run `rocket status` to see overall progress'}</Text>
        <Text color="green">{BORDER}</Text>
      </Box>
    )
  }

  if (outcome === 'blocked') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="red">{BORDER}</Text>
        <Text>
          {'  🚫 '}
          <Text color="red" bold>
            Loop blocked — needs human input
          </Text>
        </Text>
        <Text>
          {'  📌 Task: '}
          <Text color="cyan">{taskLabel}</Text>
        </Text>
        <Text>
          {'  💬 Reason: '}
          <Text color="white">{blockedReason ?? 'No reason provided'}</Text>
        </Text>
        <Text>
          {'  ⏱  Stopped at iteration '}
          <Text color="yellow">{iterations}</Text>
          {'  ·  Total: '}
          <Text color="yellow">{formatMs(totalMs)}</Text>
        </Text>
        <Text color="red">{BORDER}</Text>
      </Box>
    )
  }

  if (outcome === 'decide') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="magenta">{BORDER}</Text>
        <Text>
          {'  ❓ '}
          <Text color="magenta" bold>
            Decision needed
          </Text>
        </Text>
        <Text>
          {'  📌 Task: '}
          <Text color="cyan">{taskLabel}</Text>
        </Text>
        <Text>
          {'  💬 Question: '}
          <Text color="white">{decideQuestion ?? 'No question provided'}</Text>
        </Text>
        <Text>
          {'  ⏱  Stopped at iteration '}
          <Text color="yellow">{iterations}</Text>
          {'  ·  Total: '}
          <Text color="yellow">{formatMs(totalMs)}</Text>
        </Text>
        <Text color="magenta">{BORDER}</Text>
      </Box>
    )
  }

  // max-iterations
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="yellow">{BORDER}</Text>
      <Text>
        {'  ⚠️  '}
        <Text color="yellow" bold>
          Max iterations reached ({iterations})
        </Text>
      </Text>
      <Text>
        {'  📌 Task: '}
        <Text color="cyan">{taskLabel}</Text>
      </Text>
      <Text>
        {'  ⏱  Total: '}
        <Text color="yellow">{formatMs(totalMs)}</Text>
        {'  ·  Avg: '}
        <Text color="yellow">{formatMs(avgMs)}</Text>
      </Text>
      <Text dimColor>{'  Check .agent/logs/LOG.md for progress'}</Text>
      <Text color="yellow">{BORDER}</Text>
    </Box>
  )
}
