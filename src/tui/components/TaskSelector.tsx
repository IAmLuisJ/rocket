import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import type { Task } from '../../lib/tasks/schema.js'

interface Props {
  tasks: Task[]
  backendName: string
  projectName: string
  onSelect: (task: Task | null) => void
}

function CyanItem({ isSelected = false, label }: { isSelected?: boolean; label: string }) {
  return <Text color={isSelected ? 'cyan' : undefined}>{label}</Text>
}

export function TaskSelector({ tasks, backendName, projectName, onSelect }: Props) {
  const incomplete = tasks.filter((t) => !t.passes)

  const items = [
    { label: 'Auto — pick next incomplete', value: 'auto' },
    ...incomplete.map((t) => ({
      label: `[#${t.id}] ${t.title}`,
      value: String(t.id),
    })),
  ]

  function handleSelect(item: { value: string }) {
    if (item.value === 'auto') {
      onSelect(null)
    } else {
      const task = incomplete.find((t) => String(t.id) === item.value) ?? null
      onSelect(task)
    }
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text color="cyan" bold>
          🚀 Rocket Loop
        </Text>
        <Text dimColor>
          Project: <Text color="white">{projectName}</Text>
          {'  ·  '}Backend: <Text color="yellow">{backendName}</Text>
        </Text>
        <Text dimColor>
          Incomplete tasks: <Text color="yellow">{incomplete.length}</Text>
        </Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          Select task to focus on:
        </Text>
      </Box>
      <SelectInput items={items} itemComponent={CyanItem} onSelect={handleSelect} />
    </Box>
  )
}
