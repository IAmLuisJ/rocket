import { useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import fs from 'fs-extra'
import path from 'node:path'

interface Props {
  question: string
  agentDir: string
  onDecide: (answer: string) => void
}

export function DecideScreen({ question, agentDir, onDecide }: Props) {
  const [answer, setAnswer] = useState('')

  async function handleSubmit(value: string) {
    const decisionsPath = path.join(agentDir, 'decisions.md')
    await fs.appendFile(decisionsPath, `## ${question}\n\n${value}\n\n`, 'utf-8')
    onDecide(value)
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        🤔 Decision Needed
      </Text>
      <Box marginTop={1}>
        <Text>{question}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Your answer: </Text>
        <TextInput value={answer} onChange={setAnswer} onSubmit={handleSubmit} />
      </Box>
    </Box>
  )
}
