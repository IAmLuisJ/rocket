import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { ChildProcess } from 'child_process'
import { runLoop, type LoopOptions, type LoopEvent } from '../../lib/loop-runner.js'
import type { IterationStats } from '../RocketLoopApp.js'

export type LoopPhase =
  | 'idle'
  | 'running'
  | 'complete'
  | 'blocked'
  | 'decide'
  | 'max-reached'
  | 'all-tasks-complete'

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
    case 'all-tasks-complete':
      return { ...state, phase: 'all-tasks-complete' }
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
  togglePause: () => void
  skip: () => void
  paused: boolean
}

export function useLoopRunner(): UseLoopRunnerResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef(false)
  const pausedRef = useRef(false)
  const [paused, setPaused] = useReducer((s: boolean) => !s, false)
  const runningRef = useRef(false)
  const childRef = useRef<ChildProcess | null>(null)

  const stop = useCallback(() => {
    abortRef.current = true
    if (childRef.current) {
      childRef.current.kill()
      childRef.current = null
    }
  }, [])

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    setPaused()
  }, [])

  const skip = useCallback(() => {
    if (childRef.current) {
      childRef.current.kill()
      childRef.current = null
    }
  }, [])

  const start = useCallback((options: LoopOptions) => {
    if (runningRef.current) return
    runningRef.current = true
    abortRef.current = false
    pausedRef.current = false
    dispatch({ type: 'start' })
    ;(async () => {
      try {
        const gen = runLoop({
          ...options,
          onChild: (proc) => {
            childRef.current = proc
          },
        })
        for await (const event of gen) {
          // Wait while paused
          while (pausedRef.current && !abortRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
          if (abortRef.current) {
            await gen.return(undefined)
            break
          }
          dispatch(event)
        }
      } finally {
        runningRef.current = false
        childRef.current = null
      }
    })()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
      if (childRef.current) {
        childRef.current.kill()
        childRef.current = null
      }
    }
  }, [])

  return { state, start, stop, togglePause, skip, paused }
}
