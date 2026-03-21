import { useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

interface Props {
  featureDescription: string
  questions: string[]
  onComplete: (answers: { question: string; answer: string }[]) => void
}

export function FeatureWizard({ featureDescription, questions, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([])
  const [input, setInput] = useState('')

  function handleSubmit(value: string) {
    const newAnswers = [...answers, { question: questions[currentIndex], answer: value }]
    setInput('')

    if (currentIndex + 1 >= questions.length) {
      onComplete(newAnswers)
    } else {
      setAnswers(newAnswers)
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Rocket Feature
        </Text>
        <Text dimColor> — {featureDescription}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Question {currentIndex + 1} of {questions.length}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold>{questions[currentIndex]}</Text>
      </Box>

      <Box>
        <Text color="green">{'> '}</Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>

      {answers.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Previous answers:</Text>
          {answers.map((a, i) => (
            <Box key={i} marginLeft={2}>
              <Text dimColor>
                {a.question}: {a.answer}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
