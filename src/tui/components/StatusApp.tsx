import { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Task } from '../../lib/tasks/schema.js'
import type { ProgressStats } from '../../lib/progress/calculator.js'
import { calculateProgress } from '../../lib/progress/calculator.js'
import {
  readRecentActivity,
  getCurrentTask,
  type ActivityEntry,
} from '../../lib/progress/logReader.js'
import { readHistoryStats, type HistoryStats } from '../../lib/progress/historyReader.js'
import { readTasks } from '../../lib/tasks/reader.js'
import { StatusDashboard } from './StatusDashboard.js'

interface Props {
  tasks: Task[]
  progress: ProgressStats
  watch?: boolean
  categoryFilter?: string
  projectName?: string
  activity?: ActivityEntry[]
  history?: HistoryStats
  currentTask?: Task | null
}

export function StatusApp({
  tasks: initialTasks,
  progress: initialProgress,
  watch,
  categoryFilter,
  projectName = process.cwd().split('/').pop() ?? 'project',
  activity: initialActivity = [],
  history: initialHistory = { sessionCount: 0, totalRuntimeSeconds: 0 },
  currentTask: initialCurrentTask = null,
}: Props) {
  void initialTasks
  const { exit } = useApp()
  const [progress, setProgress] = useState(initialProgress)
  const [activity, setActivity] = useState<ActivityEntry[]>(initialActivity)
  const [history, setHistory] = useState<HistoryStats>(initialHistory)
  const [currentTask, setCurrentTask] = useState<Task | null>(initialCurrentTask)

  useInput((_input, key) => {
    if (key.escape || _input === 'q') {
      exit()
    }
  })

  // Watch mode: refresh every 5 seconds
  useEffect(() => {
    const projectRoot = process.cwd()
    const agentDir = `${projectRoot}/.agent`

    async function refresh() {
      try {
        const tasksFile = readTasks(projectRoot)
        const nextTasks = categoryFilter
          ? tasksFile.tasks.filter((task) => task.category === categoryFilter)
          : tasksFile.tasks
        setProgress(calculateProgress(nextTasks))
        setActivity(await readRecentActivity(agentDir, 5))
        setHistory(await readHistoryStats(agentDir))
        setCurrentTask(await getCurrentTask(agentDir, tasksFile.tasks))
      } catch {
        // Keep the last good dashboard state during watch refresh errors.
      }
    }

    void refresh()

    if (!watch) return

    const interval = setInterval(() => {
      void refresh()
    }, 5000)

    return () => clearInterval(interval)
  }, [watch, categoryFilter])

  return (
    <Box flexDirection="column">
      <StatusDashboard
        projectName={projectName}
        stats={progress}
        activity={activity}
        history={history}
        currentTask={currentTask}
        categoryFilter={categoryFilter}
        watch={watch}
      />
      <Box marginTop={1}>
        <Text dimColor>Press q or Esc to exit</Text>
      </Box>
    </Box>
  )
}
