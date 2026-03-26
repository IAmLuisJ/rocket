import { useState } from 'react'
import { Box, Text, useApp } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import { scaffold } from '../../lib/scaffold.js'
import type { ScaffoldOptions, ScaffoldProgress } from '../../lib/scaffold.js'
import { join } from 'path'

type Step = 'name' | 'type' | 'features' | 'scaffolding' | 'done' | 'error'

export function SuccessScreen({ name, projectType }: { name: string; projectType: string }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="green" bold>
        ✅ Project created successfully!
      </Text>
      <Text>
        {'  '}Name: <Text bold>{name}</Text>
      </Text>
      <Text>
        {'  '}Type: <Text bold>{projectType}</Text>
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Next steps:</Text>
        <Text>
          {'  '}
          <Text color="cyan">cd {name} && rocket loop</Text>
        </Text>
      </Box>
    </Box>
  )
}

export function ProgressStep({ label, done }: { label: string; done: boolean }) {
  return (
    <Box>
      {done ? (
        <Text color="green">✓</Text>
      ) : (
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
      )}
      <Text> {label}</Text>
    </Box>
  )
}

interface Props {
  initialName?: string
  initialType?: string
}

const PROJECT_TYPES = [
  { label: 'Web App (React + Express)', value: 'webapp' },
  { label: 'Website (PHP + MySQL)', value: 'website' },
]

const FEATURE_TOGGLES = [
  { label: 'Authentication (JWT + bcrypt)', key: 'auth' },
  { label: 'Email (Nodemailer)', key: 'email' },
  { label: 'PDF Renderer', key: 'pdf' },
]

export function NewProjectWizard({ initialName, initialType }: Props) {
  const { exit } = useApp()

  const [step, setStep] = useState<Step>(initialName ? (initialType ? 'features' : 'type') : 'name')
  const [name, setName] = useState(initialName ?? '')
  const [nameInput, setNameInput] = useState('')
  const [projectType, setProjectType] = useState(initialType ?? '')
  const [features, setFeatures] = useState<ScaffoldOptions>({
    auth: true,
    email: false,
    pdf: false,
  })
  const [progressStep, setProgressStep] = useState<ScaffoldProgress | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleNameSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setName(trimmed)
    setStep('type')
  }

  const handleTypeSelect = (item: { value: string }) => {
    setProjectType(item.value)
    if (item.value === 'webapp') {
      setStep('features')
    } else {
      void doScaffold(name, item.value as 'webapp' | 'website', features)
    }
  }

  const handleFeaturesConfirm = () => {
    void doScaffold(name, projectType as 'webapp' | 'website', features)
  }

  const doScaffold = async (
    projName: string,
    type: 'webapp' | 'website',
    opts: ScaffoldOptions,
  ) => {
    setStep('scaffolding')
    setProgressStep('scaffolding')
    const destPath = join(process.cwd(), projName)

    try {
      await scaffold(type, projName, destPath, opts, (step) => {
        setProgressStep(step)
      })
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStep('error')
    }
  }

  if (step === 'name') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Rocket — New Project
        </Text>
        <Box marginTop={1}>
          <Text>Project name: </Text>
          <TextInput value={nameInput} onChange={setNameInput} onSubmit={handleNameSubmit} />
        </Box>
      </Box>
    )
  }

  if (step === 'type') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Rocket — New Project
        </Text>
        <Text dimColor>Project: {name}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Select project type:</Text>
          <SelectInput items={PROJECT_TYPES} onSelect={handleTypeSelect} />
        </Box>
      </Box>
    )
  }

  if (step === 'features') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Rocket — New Project
        </Text>
        <Text dimColor>
          Project: {name} ({projectType})
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Feature toggles:</Text>
          {FEATURE_TOGGLES.map((f) => {
            const enabled = features[f.key as keyof ScaffoldOptions]
            return (
              <Text key={f.key}>
                {enabled ? '  ✓ ' : '  ✗ '}
                {f.label}
              </Text>
            )
          })}
          <Box marginTop={1}>
            <SelectInput
              items={[
                ...FEATURE_TOGGLES.map((f) => ({ label: `Toggle ${f.label}`, value: f.key })),
                { label: 'Continue →', value: '_continue' },
              ]}
              onSelect={(item) => {
                if (item.value === '_continue') {
                  handleFeaturesConfirm()
                } else {
                  const key = item.value as keyof ScaffoldOptions
                  setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
                }
              }}
            />
          </Box>
        </Box>
      </Box>
    )
  }

  if (step === 'scaffolding') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Rocket — New Project
        </Text>
        <Box marginTop={1} flexDirection="column">
          <ProgressStep label={`Scaffolding ${name}...`} done={progressStep !== 'scaffolding'} />
          {progressStep !== 'scaffolding' && (
            <ProgressStep label="Installing dependencies..." done={progressStep !== 'installing'} />
          )}
          {(progressStep === 'git' || progressStep === 'done') && (
            <ProgressStep label="Initializing git..." done={progressStep === 'done'} />
          )}
        </Box>
      </Box>
    )
  }

  if (step === 'error') {
    setTimeout(() => exit(), 100)
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          Error
        </Text>
        <Text>{errorMsg}</Text>
      </Box>
    )
  }

  // step === 'done'
  setTimeout(() => exit(), 500)
  return <SuccessScreen name={name} projectType={projectType} />
}
