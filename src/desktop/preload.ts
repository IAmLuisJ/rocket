import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopLoopEvent } from '../lib/desktop/loopService.js'
import type { ProjectDashboard } from '../lib/desktop/projectService.js'

export interface RocketDesktopApi {
  readProject(projectRoot: string): Promise<ProjectDashboard>
  chooseProject(): Promise<ProjectDashboard | null>
  setTaskPasses(projectRoot: string, taskId: number, passes: boolean): Promise<ProjectDashboard>
  startLoop(options: {
    projectRoot: string
    backendName: 'copilot' | 'claude' | 'docker'
    maxIterations: number
    taskId?: number | null
  }): Promise<{ ok: boolean; message: string }>
  stopLoop(): Promise<{ ok: boolean; message: string }>
  onLoopEvent(
    callback: (event: DesktopLoopEvent | { type: 'error'; message: string }) => void,
  ): () => void
}

const rocket: RocketDesktopApi = {
  readProject(projectRoot) {
    return ipcRenderer.invoke('project:read', projectRoot) as Promise<ProjectDashboard>
  },
  chooseProject() {
    return ipcRenderer.invoke('project:choose') as Promise<ProjectDashboard | null>
  },
  setTaskPasses(projectRoot, taskId, passes) {
    return ipcRenderer.invoke(
      'task:set-passes',
      projectRoot,
      taskId,
      passes,
    ) as Promise<ProjectDashboard>
  },
  startLoop(options) {
    return ipcRenderer.invoke('loop:start', options) as Promise<{ ok: boolean; message: string }>
  },
  stopLoop() {
    return ipcRenderer.invoke('loop:stop') as Promise<{ ok: boolean; message: string }>
  },
  onLoopEvent(callback) {
    const listener = (_event: Electron.IpcRendererEvent, loopEvent: DesktopLoopEvent) => {
      callback(loopEvent)
    }
    ipcRenderer.on('loop:event', listener)
    return () => ipcRenderer.off('loop:event', listener)
  },
}

contextBridge.exposeInMainWorld('rocket', rocket)
