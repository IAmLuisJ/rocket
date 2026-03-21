import { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Task } from '../../lib/tasks/schema.js'
import type { ProgressStats } from '../../lib/progress/calculator.js'
import { calculateProgress } from '../../lib/progress/calculator.js'
import { readRecentActivity, detectCurrentFocusTask } from '../../lib/progress/logReader.js'
import { getSessionSummary } from '../../lib/progress/historyReader.js'
import { readTasks } from '../../lib/tasks/reader.js'
import { ProgressBar } from './ProgressBar.js'

interface Props {
  tasks: Task[]
  progress: ProgressStats
  watch?: boolean
  categoryFilter?: string
}

export function StatusApp({ tasks: initialTasks, progress: initialProgress, watch, categoryFilter }: Props) {
  const { exit } = useApp()
  const [, setTasks] = useState(initialTasks)
  const [progress, setProgress] = useState(initialProgress)

  useInput((_input, key) => {
    if (key.escape || _input === 'q') {
      exit()
    }
  })

  // Watch mode: refresh every 5 seconds
  useEffect(() => {
    if (!watch) return

    const interval = setInterval(() => {
      try {
        const projectRoot = process.cwd()
        const tasksFile = readTasks(projectRoot)
        setTasks(tasksFile.tasks)
        setProgress(calculateProgress(tasksFile.tasks))
      } catch {
        // Ignore errors during refresh
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [watch])

  const projectRoot = process.cwd()
  const focusTask = detectCurrentFocusTask(projectRoot)
  const recentActivity = readRecentActivity(projectRoot, 5)
  const sessionSummary = getSessionSummary(projectRoot)

  // Filter categories if requested
  const categories = Object.entries(progress.byCategory)
    .filter(([cat]) => !categoryFilter || cat === categoryFilter)
    .sort(([, a], [, b]) => b.percent - a.percent)

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5)

  const totalMinutes = Math.round(sessionSummary.totalRuntimeSec / 60)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const runtimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Rocket Status
        </Text>
        <Text dimColor>
          {' '}
          · {dateStr} {timeStr}
          {watch ? ' (watching)' : ''}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold>Overall Progress</Text>
        <Box>
          <ProgressBar percent={progress.overall.percent} width={30} />
          <Text dimColor>
            {' '}
            {progress.overall.complete}/{progress.overall.total} tasks
          </Text>
        </Box>
      </Box>

      {focusTask && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold>Current Focus Task</Text>
          <Text>
            #{focusTask.id} · {focusTask.title}
          </Text>
        </Box>
      )}

      <Box marginBottom={1} flexDirection="column">
        <Text bold>By Category</Text>
        {categories.map(([cat, stats]) => (
          <Box key={cat}>
            <Text>{cat.padEnd(16)}</Text>
            <ProgressBar percent={stats.percent} width={10} />
            <Text dimColor>
              {' '}
              {stats.complete}/{stats.total}
            </Text>
          </Box>
        ))}
      </Box>

      {recentActivity.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold>Recent Activity</Text>
          {recentActivity.map((entry, i) => (
            <Box key={i}>
              <Text color={entry.outcome === 'complete' ? 'green' : 'yellow'}>
                {entry.outcome === 'complete' ? '✅' : '🔄'}
              </Text>
              <Text>
                {' '}
                {entry.taskId ? `#${entry.taskId}` : 'Auto'} {entry.taskTitle ?? ''}{' '}
              </Text>
              <Text dimColor>{entry.durationSec.toFixed(0)}s</Text>
            </Box>
          ))}
        </Box>
      )}

      <Box>
        <Text dimColor>
          Sessions: {sessionSummary.sessionCount} · Runtime: {runtimeStr}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press q or Esc to exit</Text>
      </Box>
    </Box>
  )
}
