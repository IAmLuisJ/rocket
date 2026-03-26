import { spawn, type ChildProcess } from 'child_process'

export function start(): ChildProcess | null {
  if (process.platform !== 'darwin') return null
  return spawn('caffeinate', ['-i'], {
    stdio: 'ignore',
    detached: false,
  })
}

export function stop(proc: ChildProcess | null): void {
  if (proc === null) return
  try {
    proc.kill('SIGTERM')
  } catch {
    /* process already exited */
  }
}
