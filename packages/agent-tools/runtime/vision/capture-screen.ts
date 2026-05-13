import { spawn } from 'node:child_process'

export async function captureScreen(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return reject(new Error('Unsupported platform'))
    }

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

      $memoryStream = New-Object System.IO.MemoryStream
      $bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Jpeg)

      $bytes = $memoryStream.ToArray()

      [Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)

      $memoryStream.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    `


    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    const chunks: Buffer[] = []
    let error = ''

    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    child.stderr.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(
          new Error(error || 'Failed to capture screenshot')
        )
      }
    })
  })
}