import { useReducer, useEffect, useRef, useCallback } from 'react'
import { runLoop, type LoopOptions, type LoopEvent } from '../../lib/loop-runner.js'
import type { IterationStats } from '../RocketLoopApp.js'

export type LoopPhase = 'idle' | 'running' | 'complete' | 'blocked' | 'decide' | 'max-reached'

export interface LoopState {
  phase: LoopPhase
  currentIteration: number
  outputLines: string[]
  iterations: number
  totalMs: number
  iterationStats: IterationStats[]
  blockedReason?: string
  decideQuestion?: string
}

const initialState: LoopState = {
  phase: 'idle',
  currentIteration: 0,
  outputLines: [],
  iterations: 0,
  totalMs: 0,
  iterationStats: [],
}

function reducer(state: LoopState, event: LoopEvent | { type: 'start' }): LoopState {
  switch (event.type) {
    case 'start':
      return { ...initialState, phase: 'running' }
    case 'iteration-start':
      return { ...state, currentIteration: event.n, outputLines: [] }
    case 'output':
      return { ...state, outputLines: [...state.outputLines, event.line] }
    case 'complete':
      return { ...state, phase: 'complete' }
    case 'blocked':
      return { ...state, phase: 'blocked', blockedReason: event.reason }
    case 'decide':
      return { ...state, phase: 'decide', decideQuestion: event.question }
    case 'max-reached':
      return { ...state, phase: 'max-reached' }
    case 'timing':
      return {
        ...state,
        iterations: event.iterationN,
        totalMs: state.totalMs + event.elapsedMs,
        iterationStats: [
          ...state.iterationStats,
          { iteration: event.iterationN, durationMs: event.elapsedMs },
        ],
      }
    default:
      return state
  }
}

export interface UseLoopRunnerResult {
  state: LoopState
  start: (options: LoopOptions) => void
  stop: () => void
}

export function useLoopRunner(): UseLoopRunnerResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef(false)
  const runningRef = useRef(false)

  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  const start = useCallback((options: LoopOptions) => {
    if (runningRef.current) return
    runningRef.current = true
    abortRef.current = false
    dispatch({ type: 'start' })
    ;(async () => {
      try {
        const gen = runLoop(options)
        for await (const event of gen) {
          if (abortRef.current) {
            await gen.return(undefined)
            break
          }
          dispatch(event)
        }
      } finally {
        runningRef.current = false
      }
    })()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  return { state, start, stop }
}
