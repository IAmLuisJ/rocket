import type { ChildProcess } from 'child_process'

export type BackendOptions = {
  prompt: string
  maxIterations?: number
  cwd?: string
}

export type ParsedOutput =
  | { type: 'text'; content: string }
  | { type: 'json'; data: unknown }
  | { type: 'complete' }
  | { type: 'blocked'; reason: string }
  | { type: 'decide'; question: string }

export interface AgentBackend {
  name: string
  spawn(prompt: string, options: BackendOptions): ChildProcess
  parseOutput(line: string): ParsedOutput | null
}
