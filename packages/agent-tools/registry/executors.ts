import { openApp } from '../desktop/open-app/index.js'
import { captureScreenshot } from '../desktop/capture_screenshot/index.js'

export const toolExecutors = {
  openApp: async (input: any) => {
    return openApp({ app: input.app })
  },
  captureScreenshot: async () => {
    return captureScreenshot()
  }
}