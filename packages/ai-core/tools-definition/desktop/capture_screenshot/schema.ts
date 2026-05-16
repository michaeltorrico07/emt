import { z } from 'zod'

export const captureScreenshotSchema = z.object({

})

export type CaptureScreenshotInput = z.infer<typeof captureScreenshotSchema>
export const jsonCaptureScreenshotSchema = z.toJSONSchema(captureScreenshotSchema)