import { exec } from 'node:child_process'
import type { OpenAppInput } from './schema.js'

export async function execute({ app }: OpenAppInput) {
  return new Promise((resolve, reject) => {
    let command = ''

    switch (process.platform) {
      case 'win32':
        command = `start "" "${app}"`
        break

      default:
        return reject(
          new Error('Unsupported platform')
        )
    }

    exec(command, (error: any) => {
      if (error) {
        reject(error)
      } else {
        resolve({
          success: true,
          app
        })
      }
    })
  })
}