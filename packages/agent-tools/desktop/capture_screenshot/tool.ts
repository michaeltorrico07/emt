import { jsonCaptureScreenshotSchema, captureScreenshotSchema } from './schema.js'

export const captureScreenshot = {
  name: 'capture_screenshot',
  description: 'Capture a screenshot of the current desktop screen',
  jsonSchema: jsonCaptureScreenshotSchema,
  zodSchema: captureScreenshotSchema
} as const
