import { Box, Text, useApp, useInput } from 'ink'

interface Props {
  reason: string
}

export function BlockedScreen({ reason }: Props) {
  const { exit } = useApp()

  useInput(() => {
    exit()
  })

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="red">
        ⛔ Loop Blocked
      </Text>
      <Box marginTop={1}>
        <Text>{reason}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Fix the issue and run rocket loop again. Press any key to exit.</Text>
      </Box>
    </Box>
  )
}
