import { Text } from 'ink'

interface Props {
  percent: number
  complete?: number
  total?: number
  width?: number
}

export function ProgressBar({ percent, complete, total, width }: Props) {
  const terminalWidth = process.stdout.columns ?? 80
  const barWidth = width ?? Math.max(10, Math.min(terminalWidth - 20, 40))
  const clampedPercent = Math.max(0, Math.min(100, percent))
  const filled = Math.round((clampedPercent / 100) * barWidth)
  const empty = barWidth - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const counts = complete !== undefined && total !== undefined ? `${complete}/${total} ` : ''

  return (
    <Text>
      <Text color="green">{bar}</Text>
      <Text dimColor>
        {' '}
        {counts}
        {clampedPercent}%
      </Text>
    </Text>
  )
}
