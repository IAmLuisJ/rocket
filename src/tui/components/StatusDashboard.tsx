import { Box, Text } from 'ink'
import type { Task } from '../../lib/tasks/schema.js'
import type { ProgressStats } from '../../lib/progress/calculator.js'
import type { ActivityEntry } from '../../lib/progress/logReader.js'
import type { HistoryStats } from '../../lib/progress/historyReader.js'
import { ProgressBar } from './ProgressBar.js'

interface Props {
  projectName: string
  stats: ProgressStats
  activity: ActivityEntry[]
  history: HistoryStats
  currentTask: Task | null
  categoryFilter?: string
  watch?: boolean
}

export function StatusDashboard({
  projectName,
  stats,
  activity,
  history,
  currentTask,
  categoryFilter,
  watch,
}: Props) {
  const now = new Date()
  const categories = Object.entries(stats.byCategory)
    .filter(([category]) => !categoryFilter || category === categoryFilter)
    .sort(([a], [b]) => a.localeCompare(b))

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Rocket Status
        </Text>
        <Text dimColor>
          {' '}
          · {projectName} · {now.toLocaleString()}
          {watch ? ' · watching' : ''}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold>Overall Progress</Text>
        <ProgressBar
          percent={stats.overall.percent}
          complete={stats.overall.complete}
          total={stats.overall.total}
          width={30}
        />
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold>Current Focus Task</Text>
        {currentTask ? (
          <>
            <Text>
              #{currentTask.id} · {currentTask.title}
            </Text>
            <Text dimColor>
              Category: {currentTask.category} · Status:{' '}
              {currentTask.passes ? 'complete' : 'in progress'}
            </Text>
          </>
        ) : (
          <Text dimColor>N/A</Text>
        )}
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold>By Category</Text>
        {categories.map(([category, categoryStats]) => (
          <Box key={category}>
            <Text>{category.padEnd(16)}</Text>
            <ProgressBar
              percent={categoryStats.percent}
              complete={categoryStats.complete}
              total={categoryStats.total}
              width={12}
            />
          </Box>
        ))}
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold>Recent Activity</Text>
        {activity.length === 0 ? (
          <Text dimColor>N/A</Text>
        ) : (
          activity.map((entry, index) => (
            <Box key={`${entry.taskId ?? 'auto'}-${index}`}>
              <Text color={entry.outcome === 'complete' ? 'green' : 'yellow'}>
                {entry.outcome === 'complete' ? '✓' : '↻'}
              </Text>
              <Text>
                {' '}
                {entry.taskId ? `#${entry.taskId}` : 'Auto'} {entry.taskTitle ?? ''}
              </Text>
              <Text dimColor> · {entry.outcome}</Text>
            </Box>
          ))
        )}
      </Box>

      <Box>
        <Text dimColor>
          Loop Sessions: {history.sessionCount} · Total runtime:{' '}
          {formatRuntime(history.totalRuntimeSeconds)}
        </Text>
      </Box>
    </Box>
  )
}

function formatRuntime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
