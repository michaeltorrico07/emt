import { app, BrowserWindow, ipcMain } from 'electron'
import { executors } from '@packages/agent-tools'
import { fileURLToPath } from 'node:url'
import { APP_REGISTRY } from './app_registry.js'
import Fuse from 'fuse.js'

async function bootstrap() {
  await app.whenReady()

  ipcMain.handle('chat:send', async (_, prompt) => {
    const apps = APP_REGISTRY.map(a => ({ id: a.id, name: a.name }))
    const fuse = new Fuse(APP_REGISTRY, {  
      keys: ['name', 'id'], 
      threshold: 0.4
    })
    console.log(prompt) 
    const res = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt, apps }),   
    }) 

    const data = await res.json()
    console.log(data)
    if (data.type === 'tool') {
      if (data.tool === 'open_app') {
        const results = fuse.search(data.input.app.trim().toLowerCase())
        const match = results[0]

        if (!match) {
          return {
            type: 'error',
            error: 'APP_NOT_FOUND',
            content: `No encontré la app ${data.input.app}`
          }
        }

        await executors.openApp({
          app: match.item.exec
        })

        return {
          type: 'text',
          error: null,
          content: `Abriendo ${match.item.name}`,
        }
      }
      if (data.tool === 'capture_screenshot') {
        try {
          const result = await executors.captureScreenshot()
          console.log('Screenshot result:', result)
          return {
            type: 'text',
            error: null,
            content: `Screenshot guardado`,
          }
        } catch (err) {
          console.error('Screenshot error:', err)
          return {
            type: 'error',
            error: 'SCREENSHOT_FAILED',
            content: `Error al capturar pantalla: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      }
    }
    if (data.type == 'error') {
      return {
        type: 'error',
        error: null,
        content: data.content,
      }
    }

    return data
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