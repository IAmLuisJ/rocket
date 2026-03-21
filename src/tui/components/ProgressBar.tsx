import { Text } from 'ink'

interface Props {
  percent: number
  width?: number
}

export function ProgressBar({ percent, width = 20 }: Props) {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  return (
    <Text>
      <Text color="green">{bar}</Text>
      <Text dimColor> {percent}%</Text>
    </Text>
  )
}
