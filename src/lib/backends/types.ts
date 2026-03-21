import type { ChildProcess } from 'child_process'

export interface BackendOptions {
  prompt: string
  projectRoot: string
  model?: string
}

export interface ParsedOutput {
  text: string
  isComplete: boolean
  isBlocked: boolean
  isDecide: boolean
  blockedReason?: string
  decideQuestion?: string
}

export interface AgentBackend {
  name: string
  spawn(options: BackendOptions): ChildProcess
  parseOutputLine(line: string): ParsedOutput | null
}
