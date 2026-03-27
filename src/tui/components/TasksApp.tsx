import { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import type { Task } from '../../lib/tasks/schema.js'
import { brand, success, error } from '../themes/colors.js'

interface Props {
  tasks: Task[]
  initialFilter?: string
  onMarkComplete?: (taskId: number) => void
}

type FilterMode = 'all' | 'incomplete' | 'complete' | 'blocked'

function TaskDetail({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <Box borderStyle="round" paddingX={1} flexGrow={1}>
        <Text dimColor>Select a task to view details</Text>
      </Box>
    )
  }

  return (
    <Box borderStyle="round" paddingX={1} flexDirection="column" flexGrow={1}>
      <Text bold color={brand}>
        #{task.id} {task.title}
      </Text>
      <Box marginTop={1}>
        <Text>{task.description}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">Pass condition: {task.passCondition}</Text>
      </Box>
      {task.blockedReason && (
        <Box>
          <Text color={error}>Blocked: {task.blockedReason}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>Category: </Text>
        <Text>{task.category}</Text>
      </Box>
      <Box>
        <Text dimColor>Status: </Text>
        <Text color={task.passes ? success : error}>{task.passes ? 'Complete' : 'Incomplete'}</Text>
      </Box>
    </Box>
  )
}

export function TasksApp({ tasks, initialFilter, onMarkComplete }: Props) {
  const { exit } = useApp()
  const [filter, setFilter] = useState<FilterMode>((initialFilter as FilterMode) ?? 'all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useInput((input) => {
    if (input === 'q') exit()
    if (input === 'f') {
      const modes: FilterMode[] = ['all', 'incomplete', 'complete', 'blocked']
      const idx = modes.indexOf(filter)
      setFilter(modes[(idx + 1) % modes.length]!)
    }
    if (input === 'b' && selectedTask) {
      setSelectedTask(null)
    }
    if (input === 'm' && selectedTask && !selectedTask.passes && onMarkComplete) {
      onMarkComplete(selectedTask.id)
      setSelectedTask({ ...selectedTask, passes: true })
    }
  })

  const filtered = tasks.filter((t) => {
    if (filter === 'incomplete') return !t.passes
    if (filter === 'complete') return t.passes
    if (filter === 'blocked') return !!t.blockedReason
    return true
  })

  const items = filtered.map((t) => ({
    label: `${t.passes ? '✓' : '○'} [#${t.id}] ${t.title}`,
    value: String(t.id),
  }))

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={brand}>
        Rocket Tasks
      </Text>
      <Text dimColor>
        Filter: {filter} ({filtered.length}/{tasks.length}) · [f] toggle filter [m] mark complete
        [q] quit
      </Text>
      <Box marginTop={1}>
        <Box width="40%" flexDirection="column">
          <SelectInput
            items={items}
            onSelect={(item) => {
              const task = tasks.find((t) => String(t.id) === item.value)
              if (task) setSelectedTask(task)
            }}
          />
        </Box>
        <TaskDetail task={selectedTask} />
      </Box>
    </Box>
  )
}
