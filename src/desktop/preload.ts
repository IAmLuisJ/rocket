import { contextBridge, ipcRenderer } from 'electron'
import type { ProjectDashboard } from '../lib/desktop/projectService.js'

export interface RocketDesktopApi {
  readProject(projectRoot: string): Promise<ProjectDashboard>
  chooseProject(): Promise<ProjectDashboard | null>
  setTaskPasses(projectRoot: string, taskId: number, passes: boolean): Promise<ProjectDashboard>
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
}

contextBridge.exposeInMainWorld('rocket', rocket)
