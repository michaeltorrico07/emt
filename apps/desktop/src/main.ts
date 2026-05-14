import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron'
import { executors } from '@packages/agent-tools'
import { fileURLToPath } from 'node:url'
import { APP_REGISTRY } from './app_registry.js'
import { ChatResponse } from '@packages/ai-core'
import Fuse from 'fuse.js'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
})

dotenv.config()
const api_url = process.env.API_URL
export async function captureScreen(): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: 1280,
      height: 720,
    },
  })
 
  const screen = sources[0]

  if (!screen) {
    throw new Error('No screen source found') 
  }

  return screen.thumbnail.toJPEG(65) 
}

async function bootstrap() {
  await app.whenReady()

  ipcMain.handle('agent:observe-screen', async (_) => {
  const imageBuffer = await captureScreen() 
  const res = await fetch(`http://localhost:3000/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: new Uint8Array(imageBuffer)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  const data = await res.json()
  console.log('kwk')
  return data.comment
})

  ipcMain.handle('chat:send', async (_, prompt) => {
    const apps = APP_REGISTRY.map(a => ({ id: a.id, name: a.name }))
    const fuse = new Fuse(APP_REGISTRY, {  
      keys: ['name', 'id'], 
      threshold: 0.4
    }) 
    console.log(prompt) 
    const res = await fetch(`http://localhost:3000/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt, apps }),   
    })

    const data: ChatResponse = await res.json()
    
    if (data.type === 'tool') {
      if (data.tool === 'open_app') {
        const results = fuse.search(data.input.app)
        const match = results[0]

        if (!match) {
          return {
            type: 'error',
            error: 'APP_NOT_FOUND',
            response: data.message
          }
        }

        await executors.openApp({
          app: match.item.exec
        })

        return {
          type: 'text',
          error: null, 
          response: data.message,
        } 
      } 
      if (data.tool === 'capture_screenshot') {
        try {
          const result = await executors.captureScreenshot()
          console.log('Screenshot result:', result)
          return {
            type: 'text',
            error: null,
            response: data.message,
          }
        } catch (err) {
          console.error('Screenshot error:', err)
          return {
            type: 'error',
            error: 'SCREENSHOT_FAILED',
            response: data.message, 
          }
        }
      }
    }
    if (data.type == 'ValidationError') {
      return {
        type: 'error',
        error: true,
        response: data.message,
      }
    }

    return data
  })

  const preloadPath = fileURLToPath(new URL('./preload.js', import.meta.url))

  const windowWidth = 300 
  const windowHeight = 450

  const bottom = 150 
  const right = 30
    const win = new BrowserWindow({
      width: windowWidth, 
      height: windowHeight,
      frame: false,   
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,

      webPreferences: {
        preload: preloadPath, 
        contextIsolation: true, 
        nodeIntegration: false, 
        sandbox: false
      }
    })
  const displays = screen.getAllDisplays()

  const targetDisplay =  displays[0]

  const { x, y, width, height } = targetDisplay.workArea

  win.setPosition(
    x + width - windowWidth - right,
    y + height - windowHeight - bottom
  )
  await win.loadURL('http://localhost:5173')
}

bootstrap().catch(console.error)
