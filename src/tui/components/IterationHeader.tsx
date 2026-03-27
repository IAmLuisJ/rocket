import { Box, Text } from 'ink'

interface Props {
  n: number
  max: number
  taskId: number
}

export function IterationHeader({ n, max, taskId }: Props) {
  const width = Math.min(process.stdout.columns || 40, 60)
  const bar = '▓'.repeat(width)

  return (
    <Box flexDirection="column">
      <Text>{bar}</Text>
      <Text>
        {'↪ Iteration '}
        <Text color="yellow">{n}</Text>
        {' of '}
        {max}
        {' · Task #'}
        <Text color="yellow">{taskId}</Text>
      </Text>
      <Text>{bar}</Text>
    </Box>
  )
}
