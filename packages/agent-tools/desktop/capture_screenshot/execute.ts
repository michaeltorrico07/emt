import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SCREENSHOT_DIR = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'EMT',
  'screenshots'
)

export async function execute() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return reject(new Error('Unsupported platform'))
    }

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

    const filename = `screenshot-${Date.now()}.png`
    const finalPath = path.join(SCREENSHOT_DIR, filename)

    const escapedPath = finalPath.replace(/\\/g, '\\\\')

    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds

$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

$graphics.CopyFromScreen(
  $screen.Location,
  [System.Drawing.Point]::Empty,
  $screen.Size
)

$bitmap.Save('${escapedPath}', [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
`

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        windowsHide: true,
      }
    )

    let error = ''

    child.stderr.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          path: finalPath,
        })
      } else {
        reject(
          new Error(error || 'Failed to capture screenshot')
        )
      }
    })
  })
}