import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase, closeDatabase } from './db/database'
import { registerTestHandlers } from './ipc/tests.ipc'
import { registerQuestionHandlers } from './ipc/questions.ipc'
import { registerSessionHandlers } from './ipc/sessions.ipc'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  return win
}

function tryInitDatabase(): boolean {
  try {
    initDatabase()
    return true
  } catch (err) {
    const dbPath = path.join(app.getPath('userData'), 'quiz-app.db')
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Database error',
      message: 'Could not open the database.',
      detail: `${(err as Error).message}\n\nFile: ${dbPath}\n\nWould you like to reset the database? All data will be lost.`,
      buttons: ['Reset database', 'Quit'],
      defaultId: 1,
      cancelId: 1,
    })
    if (choice === 0) {
      try {
        fs.unlinkSync(dbPath)
        initDatabase()
        return true
      } catch (e2) {
        dialog.showErrorBox('Fatal error', `Could not reset database:\n${(e2 as Error).message}`)
      }
    }
    return false
  }
}

app.whenReady().then(() => {
  const dbOk = tryInitDatabase()
  if (!dbOk) {
    app.quit()
    return
  }

  // Register all IPC handlers after app is ready
  ipcMain.handle('app:dbStatus', () => 'ok')
  registerTestHandlers()
  registerQuestionHandlers()
  registerSessionHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
