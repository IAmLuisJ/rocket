import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopLoopEvent } from '../lib/desktop/loopService.js'
import type {
  ProjectContext,
  ProjectDashboard,
  TaskDetailsInput,
} from '../lib/desktop/projectService.js'
import type { RecentProject } from '../lib/desktop/recentProjects.js'

export interface RocketDesktopApi {
  readProject(projectRoot: string): Promise<ProjectDashboard>
  chooseProject(): Promise<ProjectDashboard | null>
  recentProjects(): Promise<RecentProject[]>
  readProjectContext(projectRoot: string): Promise<ProjectContext>
  setTaskPasses(projectRoot: string, taskId: number, passes: boolean): Promise<ProjectDashboard>
  setTaskDetails(
    projectRoot: string,
    taskId: number,
    details: TaskDetailsInput,
  ): Promise<ProjectDashboard>
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
  recentProjects() {
    return ipcRenderer.invoke('project:recent') as Promise<RecentProject[]>
  },
  readProjectContext(projectRoot) {
    return ipcRenderer.invoke('project:context', projectRoot) as Promise<ProjectContext>
  },
  setTaskPasses(projectRoot, taskId, passes) {
    return ipcRenderer.invoke(
      'task:set-passes',
      projectRoot,
      taskId,
      passes,
    ) as Promise<ProjectDashboard>
  },
  setTaskDetails(projectRoot, taskId, details) {
    return ipcRenderer.invoke(
      'task:set-details',
      projectRoot,
      taskId,
      details,
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
