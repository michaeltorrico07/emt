import { app, BrowserWindow, ipcMain } from 'electron'
import { openApp } from '@packages/agent-tools'
import { fileURLToPath } from 'node:url'

async function bootstrap() {
  await app.whenReady()

  ipcMain.handle('open-app', async (_, appName) => {
    return openApp({ app: appName })
  })
  const preloadPath = fileURLToPath(new URL('./preload.js', import.meta.url))
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  await win.loadURL('http://localhost:5173')
  win.webContents.openDevTools()
}

bootstrap().catch(console.error)