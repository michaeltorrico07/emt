import { openApp } from './desktop/open-app/tool.js'
import { captureScreenshot } from './desktop/capture_screenshot/tool.js'


export const schemas = [
  openApp,
  captureScreenshot
] as const