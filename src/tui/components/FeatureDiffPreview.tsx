import { useState } from 'react'
import { Box, Text, useInput } from 'ink'

interface Props {
  specMarkdown: string
  tasks: Array<{ title: string; category: string }>
  onConfirm: (action: 'apply' | 'edit' | 'cancel') => void
}

export function FeatureDiffPreview({ specMarkdown, tasks, onConfirm }: Props) {
  const [selected, setSelected] = useState(0)
  const options = ['Apply', 'Edit', 'Cancel'] as const
  const actions = ['apply', 'edit', 'cancel'] as const

  useInput((_input, key) => {
    if (key.upArrow) setSelected((s) => Math.max(0, s - 1))
    if (key.downArrow) setSelected((s) => Math.min(options.length - 1, s + 1))
    if (key.return) onConfirm(actions[selected])
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Feature Preview
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>PRD Changes:</Text>
        {specMarkdown
          .split('\n')
          .slice(0, 10)
          .map((line, i) => (
            <Box key={i} marginLeft={2}>
              <Text color="green">+ {line}</Text>
            </Box>
          ))}
        {specMarkdown.split('\n').length > 10 && (
          <Box marginLeft={2}>
            <Text dimColor>... and more</Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>New Tasks ({tasks.length}):</Text>
        {tasks.map((t, i) => (
          <Box key={i} marginLeft={2}>
            <Text color="green">+ </Text>
            <Text>{t.title}</Text>
            <Text dimColor> [{t.category}]</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column">
        {options.map((opt, i) => (
          <Box key={opt}>
            <Text color={i === selected ? 'cyan' : undefined}>
              {i === selected ? '❯ ' : '  '}
              {opt}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
