import { existsSync } from 'fs'
import { join } from 'path'
import { render } from 'ink'
import React, { useState } from 'react'
import { Box, Text, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { selectBackend } from '../lib/backends/index.js'
import type { AgentBackend } from '../lib/backends/types.js'
import { generateClarifyingQuestions } from '../lib/feature/clarifier.js'
import { generateSpec, type SpecResult } from '../lib/feature/specGenerator.js'
import { mergeTasks } from '../lib/feature/taskMerger.js'
import { appendFeatureSpec } from '../lib/feature/prdWriter.js'
import { SEED_QUESTIONS } from '../lib/feature/prompts.js'
import { FeatureWizard } from '../tui/components/FeatureWizard.js'
import { FeatureDiffPreview } from '../tui/components/FeatureDiffPreview.js'
import Spinner from 'ink-spinner'

interface FeatureAppProps {
  projectRoot: string
  description?: string
  backend: AgentBackend
  noQuestions: boolean
  dryRun: boolean
}

type Phase = 'input' | 'loading-questions' | 'wizard' | 'generating' | 'preview' | 'done'

function FeatureApp({ projectRoot, description, backend, noQuestions, dryRun }: FeatureAppProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>(description ? 'loading-questions' : 'input')
  const [featureDesc, setFeatureDesc] = useState(description ?? '')
  const [questions, setQuestions] = useState<string[]>([])
  const [specResult, setSpecResult] = useState<SpecResult | null>(null)
  const [statusText, setStatusText] = useState('')
  const [inputValue, setInputValue] = useState('')

  // Start question generation when we have a description
  React.useEffect(() => {
    if (phase !== 'loading-questions') return
    if (!featureDesc) return

    if (noQuestions) {
      setPhase('generating')
      void runGeneration([])
      return
    }

    setStatusText('Generating clarifying questions...')
    void generateClarifyingQuestions(projectRoot, featureDesc, backend).then((qs) => {
      setQuestions(qs)
      setPhase('wizard')
    })
  }, [phase, featureDesc])

  async function runGeneration(qa: { question: string; answer: string }[]) {
    setPhase('generating')
    setStatusText('Generating feature spec and tasks...')
    try {
      const result = await generateSpec(projectRoot, featureDesc, qa, backend)
      setSpecResult(result)
      setPhase('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatusText(`Error: ${msg}`)
      setPhase('done')
    }
  }

  function handleDescriptionSubmit(value: string) {
    setFeatureDesc(value)
    setPhase('loading-questions')
  }

  function handleWizardComplete(answers: { question: string; answer: string }[]) {
    void runGeneration(answers)
  }

  function handlePreviewConfirm(action: 'apply' | 'edit' | 'cancel') {
    if (action === 'cancel' || !specResult) {
      setStatusText('Cancelled.')
      setPhase('done')
      setTimeout(() => exit(), 100)
      return
    }

    if (action === 'edit') {
      // For now, re-run generation with seed questions
      setQuestions(SEED_QUESTIONS)
      setPhase('wizard')
      return
    }

    // Apply
    if (dryRun) {
      setStatusText('Dry run — no files written.')
      setPhase('done')
      setTimeout(() => exit(), 100)
      return
    }

    const mergeResult = mergeTasks(projectRoot, specResult.tasks)
    const section = appendFeatureSpec(projectRoot, specResult.specMarkdown)

    setStatusText(
      `Done! Added ${mergeResult.tasksAdded} tasks (IDs ${mergeResult.newMaxId - mergeResult.tasksAdded + 1}–${mergeResult.newMaxId}). Updated ${section} in PRD.md.`,
    )
    setPhase('done')
    setTimeout(() => exit(), 100)
  }

  if (phase === 'input') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Rocket Feature
        </Text>
        <Box marginTop={1}>
          <Text>Describe the feature: </Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleDescriptionSubmit} />
        </Box>
      </Box>
    )
  }

  if (phase === 'loading-questions' || phase === 'generating') {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> {statusText}</Text>
      </Box>
    )
  }

  if (phase === 'wizard') {
    return (
      <FeatureWizard
        featureDescription={featureDesc}
        questions={questions}
        onComplete={handleWizardComplete}
      />
    )
  }

  if (phase === 'preview' && specResult) {
    return (
      <FeatureDiffPreview
        specMarkdown={specResult.specMarkdown}
        tasks={specResult.tasks}
        onConfirm={handlePreviewConfirm}
      />
    )
  }

  return (
    <Box>
      <Text>{statusText}</Text>
    </Box>
  )
}

export async function runFeature(
  description: string | undefined,
  opts: { questions?: boolean; dryRun?: boolean; backend?: string },
): Promise<void> {
  const projectRoot = process.cwd()

  // Preflight: check required files
  const prdPath = join(projectRoot, '.agent', 'prd', 'PRD.md')
  const tasksPath = join(projectRoot, '.agent', 'tasks.json')

  if (!existsSync(prdPath) || !existsSync(tasksPath)) {
    console.error(
      '\n  ❌ Missing .agent/prd/PRD.md or .agent/tasks.json. Run rocket init first.\n',
    )
    process.exit(1)
  }

  // Select backend
  const backendOpts: { claude?: boolean; docker?: boolean } = {}
  if (opts.backend === 'claude') backendOpts.claude = true
  if (opts.backend === 'docker') backendOpts.docker = true
  const backend = selectBackend(backendOpts)

  const noQuestions = opts.questions === false
  const dryRun = opts.dryRun === true

  const { waitUntilExit } = render(
    React.createElement(FeatureApp, {
      projectRoot,
      description,
      backend,
      noQuestions,
      dryRun,
    }),
  )

  await waitUntilExit()
}
