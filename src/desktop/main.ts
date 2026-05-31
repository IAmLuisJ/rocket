import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type { ChildProcess } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getBackend } from '../lib/backends/index.js'
import type { AgentBackend } from '../lib/backends/types.js'
import { runDesktopLoop } from '../lib/desktop/loopService.js'
import {
  readProjectDashboard,
  setTaskDetails,
  setTaskPasses,
  type TaskDetailsInput,
} from '../lib/desktop/projectService.js'
import { readRecentProjects, rememberRecentProject } from '../lib/desktop/recentProjects.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let activeChild: ChildProcess | null = null
let loopRunning = false

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: 'Rocket',
    backgroundColor: '#f4f1e8',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ROCKET_DESKTOP_DEV_URL) {
    await mainWindow.loadURL(process.env.ROCKET_DESKTOP_DEV_URL)
  } else {
    await mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'))
  }
}

ipcMain.handle('project:read', async (_event, projectRoot: string) => {
  const dashboard = await readProjectDashboard(projectRoot)
  if (dashboard.hasAgent) {
    await rememberRecentProject(getRecentProjectsPath(), dashboard)
  }
  return dashboard
})

ipcMain.handle('project:choose', async () => {
  const options: Electron.OpenDialogOptions = {
    properties: ['openDirectory'],
    title: 'Open Rocket Project',
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) return null
  const dashboard = await readProjectDashboard(result.filePaths[0])
  if (dashboard.hasAgent) {
    await rememberRecentProject(getRecentProjectsPath(), dashboard)
  }
  return dashboard
})

ipcMain.handle('project:recent', async () => {
  return readRecentProjects(getRecentProjectsPath())
})

ipcMain.handle(
  'task:set-passes',
  async (_event, projectRoot: string, taskId: number, passes: boolean) => {
    return setTaskPasses(projectRoot, taskId, passes)
  },
)

ipcMain.handle(
  'task:set-details',
  async (_event, projectRoot: string, taskId: number, details: TaskDetailsInput) => {
    return setTaskDetails(projectRoot, taskId, details)
  },
)

ipcMain.handle(
  'loop:start',
  async (
    event,
    options: {
      projectRoot: string
      backendName: 'copilot' | 'claude' | 'docker'
      maxIterations: number
      taskId?: number | null
    },
  ) => {
    if (loopRunning) {
      return { ok: false, message: 'A Rocket loop is already running.' }
    }

    loopRunning = true
    const backend = selectBackend(options.backendName)

    void runDesktopLoop({
      projectRoot: options.projectRoot,
      backend,
      maxIterations: options.maxIterations,
      taskId: options.taskId,
      caffeinate: false,
      onChild(proc) {
        activeChild = proc
      },
      emit(loopEvent) {
        event.sender.send('loop:event', loopEvent)
      },
    })
      .catch((err: unknown) => {
        event.sender.send('loop:event', {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      })
      .finally(() => {
        activeChild = null
        loopRunning = false
      })

    return { ok: true, message: `Started ${backend.name}` }
  },
)

ipcMain.handle('loop:stop', async () => {
  if (!activeChild) return { ok: false, message: 'No active loop process.' }
  activeChild.kill('SIGTERM')
  activeChild = null
  return { ok: true, message: 'Stop signal sent.' }
})

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function selectBackend(name: 'copilot' | 'claude' | 'docker'): AgentBackend {
  return getBackend({
    claude: name === 'claude',
    docker: name === 'docker',
  })
}

function getRecentProjectsPath(): string {
  return join(app.getPath('userData'), 'recent-projects.json')
}
