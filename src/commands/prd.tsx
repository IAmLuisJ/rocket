import React, { useState, useEffect, useCallback } from 'react'
import { render, Box, Text, useApp } from 'ink'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'
import { createInterface } from 'readline'
import { getBackend } from '../lib/backends/index.js'
import { checkBackendAvailability } from '../lib/preflight.js'
import { buildPrdPrompt } from '../lib/prd-prompt.js'

type Phase = 'input' | 'running' | 'done' | 'error'

interface PrdAppProps {
  initialDescription?: string
  backend: ReturnType<typeof getBackend>
  projectRoot: string
}

const MAX_VISIBLE_LINES = 8

function PrdApp({ initialDescription, backend, projectRoot }: PrdAppProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>(initialDescription ? 'running' : 'input')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const runPrdGeneration = useCallback(
    (desc: string) => {
      setPhase('running')
      const prompt = buildPrdPrompt(desc, projectRoot)
      const proc = backend.spawn(prompt, { prompt, cwd: projectRoot })

      if (!proc.stdout) {
        setErrorMessage('Backend process has no stdout')
        setPhase('error')
        return
      }

      const rl = createInterface({ input: proc.stdout })

      rl.on('line', (line) => {
        const parsed = backend.parseOutput(line)
        if (!parsed) return
        if (parsed.type === 'complete') return
        if (parsed.type === 'text') {
          setOutputLines((prev) => [...prev, parsed.content])
        }
      })

      proc.on('close', (code) => {
        rl.close()
        if (code !== 0) {
          setErrorMessage(`Backend exited with code ${code}`)
          setPhase('error')
        } else {
          setPhase('done')
          setTimeout(() => exit(), 500)
        }
      })

      proc.on('error', (err) => {
        rl.close()
        setErrorMessage(err.message)
        setPhase('error')
        setTimeout(() => exit(), 100)
      })
    },
    [backend, projectRoot, exit],
  )

  useEffect(() => {
    if (initialDescription) {
      runPrdGeneration(initialDescription)
    }
  }, [initialDescription, runPrdGeneration])

  const handleDescriptionSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      runPrdGeneration(trimmed)
    },
    [runPrdGeneration],
  )

  const visibleLines = outputLines.slice(-MAX_VISIBLE_LINES)

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        {' '}
        Rocket — Initialize PRD
      </Text>
      <Box marginTop={1} />

      {phase === 'input' && (
        <Box flexDirection="column" gap={1}>
          <Text> Describe your project:</Text>
          <Box>
            <Text> › </Text>
            <TextInput
              value={description}
              onChange={setDescription}
              onSubmit={handleDescriptionSubmit}
              placeholder="e.g. A task management app with team collaboration and Stripe billing"
            />
          </Box>
        </Box>
      )}

      {phase === 'running' && (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            <Text> Generating PRD, tasks, and summaries...</Text>
          </Box>
          {visibleLines.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              {visibleLines.map((line, i) => (
                <Text key={i} color="gray" wrap="truncate">
                  {line}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {phase === 'done' && (
        <Box flexDirection="column" gap={1}>
          <Text color="green"> ✓ PRD initialized successfully!</Text>
          <Box flexDirection="column" marginLeft={2}>
            <Text color="gray">.agent/prd/PRD.md</Text>
            <Text color="gray">.agent/prd/SUMMARY.md</Text>
            <Text color="gray">.agent/tasks.json</Text>
            <Text color="gray">.agent/tasks/TASK-*.json</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="cyan"> Next: </Text>
            <Text>rocket loop</Text>
          </Box>
        </Box>
      )}

      {phase === 'error' && (
        <Box flexDirection="column" gap={1}>
          <Text color="red"> Error</Text>
          <Text color="gray"> {errorMessage}</Text>
        </Box>
      )}
    </Box>
  )
}

export async function runPrd(
  description: string | undefined,
  opts: { claude?: boolean; docker?: boolean },
): Promise<void> {
  const projectRoot = process.cwd()

  const backends = checkBackendAvailability()
  const backend = getBackend(opts)

  if (opts.docker && !backends.docker) {
    console.error('  ❌ Docker not found in PATH.')
    process.exit(1)
  }
  if (opts.claude && !backends.claude) {
    console.error(
      '  ❌ claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
    )
    process.exit(1)
  }
  if (!opts.docker && !opts.claude && !backends.copilot) {
    console.error('  ❌ copilot CLI not found. Use --claude or --docker instead.')
    process.exit(1)
  }

  const { waitUntilExit } = render(
    React.createElement(PrdApp, {
      initialDescription: description,
      backend,
      projectRoot,
    }),
  )

  await waitUntilExit()
}
