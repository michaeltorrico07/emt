import { spawn } from 'node:child_process'
import type { OpenAppInput } from './schema.js'

export async function execute({ app }: OpenAppInput) {
  return new Promise((resolve, reject) => {
    let target: string

    switch (process.platform) {
      case 'win32':
        target = app
        break

      default:
        return reject(new Error('Unsupported platform'))
    }
    console.log(target)
    const child = spawn('explorer.exe', [target], {
      detached: true,
      stdio: 'ignore',
    })

    child.unref()
    resolve({ success: true, app })
  })
}
