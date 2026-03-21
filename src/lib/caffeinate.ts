import { spawn, type ChildProcess } from 'child_process'
import { platform } from 'os'

let caffeinateProcess: ChildProcess | null = null

export function startCaffeinate(): void {
  if (platform() !== 'darwin') return
  if (caffeinateProcess) return

  caffeinateProcess = spawn('caffeinate', ['-i'], {
    stdio: 'ignore',
    detached: false,
  })
}

export function stopCaffeinate(): void {
  if (!caffeinateProcess) return
  caffeinateProcess.kill()
  caffeinateProcess = null
}
