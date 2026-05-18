import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readProjectDashboard, setTaskPasses } from '../lib/desktop/projectService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

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
  return readProjectDashboard(projectRoot)
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
  return readProjectDashboard(result.filePaths[0])
})

ipcMain.handle(
  'task:set-passes',
  async (_event, projectRoot: string, taskId: number, passes: boolean) => {
    return setTaskPasses(projectRoot, taskId, passes)
  },
)

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
