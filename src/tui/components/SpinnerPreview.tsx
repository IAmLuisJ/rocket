import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

interface Props {
  lines: string[]
}

export function SpinnerPreview({ lines }: Props) {
  const maxWidth = (process.stdout.columns || 80) - 4
  const previewLines = lines
    .slice(-5)
    .map((l) => (l.length > maxWidth ? l.slice(0, maxWidth) + '…' : l))

  return (
    <Box>
      <Spinner type="dots" />
      <Box flexDirection="column" marginLeft={1}>
        {previewLines.map((line, i) => (
          <Text key={i} dimColor>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
