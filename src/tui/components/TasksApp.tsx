import { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import type { Task } from '../../lib/tasks/schema.js'
import { brand, success, error, dim } from '../themes/colors.js'

interface Props {
  tasks: Task[]
  initialFilter?: string
  onMarkComplete?: (taskId: number) => void
}

type FilterMode = 'all' | 'incomplete' | 'complete' | 'blocked'

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

  if (selectedTask) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={brand}>
          Task #{selectedTask.id}
        </Text>
        <Text bold>{selectedTask.title}</Text>
        <Box marginTop={1}>
          <Text>{selectedTask.description}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Category: </Text>
          <Text>{selectedTask.category}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={selectedTask.passes ? success : error}>
            {selectedTask.passes ? 'Complete' : 'Incomplete'}
          </Text>
        </Box>
        <Box>
          <Text dimColor>Pass condition: </Text>
          <Text>{selectedTask.passCondition}</Text>
        </Box>
        {selectedTask.blockedReason && (
          <Box>
            <Text dimColor>Blocked: </Text>
            <Text color={error}>{selectedTask.blockedReason}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color={dim}>[b] back [m] mark complete [q] quit</Text>
        </Box>
      </Box>
    )
  }

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
        Filter: {filter} ({filtered.length}/{tasks.length}) · [f] toggle filter [q] quit
      </Text>
      <Box marginTop={1} flexDirection="column">
        <SelectInput
          items={items}
          onSelect={(item) => {
            const task = tasks.find((t) => String(t.id) === item.value)
            if (task) setSelectedTask(task)
          }}
        />
      </Box>
    </Box>
  )
}
