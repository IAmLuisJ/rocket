import { existsSync } from 'fs'
import { readFile, rm, writeFile } from 'fs/promises'
import { spawnSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { render } from 'ink'
import React, { useState } from 'react'
import { Box, Text, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { getBackend } from '../lib/backends/index.js'
import type { AgentBackend } from '../lib/backends/types.js'
import { generateClarifyingQuestions } from '../lib/feature/clarifier.js'
import { generateSpec, type SpecResult } from '../lib/feature/specGenerator.js'
import { mergeTasks } from '../lib/feature/taskMerger.js'
import { appendFeatureSpec } from '../lib/feature/prdWriter.js'
import { FeatureWizard } from '../tui/components/FeatureWizard.js'
import { FeatureDiffPreview } from '../tui/components/FeatureDiffPreview.js'
import Spinner from 'ink-spinner'

const VALID_BACKENDS = ['copilot', 'claude', 'docker'] as const

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

  async function handlePreviewConfirm(action: 'apply' | 'edit' | 'cancel') {
    if (action === 'cancel' || !specResult) {
      setStatusText('Cancelled.')
      setPhase('done')
      setTimeout(() => exit(), 100)
      return
    }

    if (action === 'edit') {
      try {
        setSpecResult(await editSpecResult(specResult))
        setPhase('preview')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatusText(`Error: ${msg}`)
        setPhase('done')
      }
      return
    }

    // Apply
    if (dryRun) {
      setStatusText('Dry run — no files written.')
      setPhase('done')
      setTimeout(() => exit(), 100)
      return
    }

    try {
      const tasksPath = join(projectRoot, '.agent', 'tasks.json')
      const mergeResult = await mergeTasks(specResult.tasks, tasksPath)
      const section = await appendFeatureSpec(projectRoot, specResult.specMarkdown)
      const firstId =
        mergeResult.added === 0
          ? mergeResult.newMaxId
          : mergeResult.newMaxId - mergeResult.added + 1

      console.log(`\n\x1b[32mFeature '${featureDesc}' added!\x1b[0m`)
      console.log(`   ${mergeResult.added} tasks added to tasks.json`)
      console.log(`   PRD updated: ${section}`)
      console.log(`\n   Run \x1b[36mrocket loop\x1b[0m to start working on the new tasks.`)

      setStatusText(
        `Done! Added ${mergeResult.added} tasks (IDs ${firstId}–${mergeResult.newMaxId}). Updated ${section} in PRD.md.`,
      )
      setPhase('done')
      setTimeout(() => exit(), 100)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatusText(`Error: ${msg}`)
      setPhase('done')
    }
  }

  if (phase === 'input') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Rocket Feature
        </Text>
        <Box marginTop={1}>
          <Text>Describe the feature: </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleDescriptionSubmit}
          />
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
    console.error('\n  ❌ Missing .agent/prd/PRD.md or .agent/tasks.json. Run rocket init first.\n')
    process.exit(1)
  }

  if (opts.backend && !VALID_BACKENDS.includes(opts.backend as (typeof VALID_BACKENDS)[number])) {
    console.error(`Invalid backend: ${opts.backend}. Valid options: ${VALID_BACKENDS.join(', ')}`)
    process.exit(1)
  }

  // Select backend
  const backendOpts: { claude?: boolean; docker?: boolean } = {}
  if (opts.backend === 'claude') backendOpts.claude = true
  if (opts.backend === 'docker') backendOpts.docker = true
  const backend = getBackend(backendOpts)

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

async function editSpecResult(specResult: SpecResult): Promise<SpecResult> {
  const tmpFile = join(tmpdir(), `rocket-feature-${Date.now()}.json`)
  await writeFile(
    tmpFile,
    JSON.stringify({ spec: specResult.specMarkdown, tasks: specResult.tasks }, null, 2),
    'utf-8',
  )

  try {
    const editor = process.env.EDITOR || 'vi'
    const result = spawnSync(editor, [tmpFile], { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`${editor} exited with status ${result.status}`)

    const parsed = JSON.parse(await readFile(tmpFile, 'utf-8')) as {
      spec?: unknown
      tasks?: unknown
    }
    if (typeof parsed.spec !== 'string' || !Array.isArray(parsed.tasks)) {
      throw new Error('Edited feature spec must be JSON with "spec" and "tasks" fields')
    }

    return {
      specMarkdown: parsed.spec,
      tasks: parsed.tasks as SpecResult['tasks'],
    }
  } finally {
    await rm(tmpFile, { force: true })
  }
}
