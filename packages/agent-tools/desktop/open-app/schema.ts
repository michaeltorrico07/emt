import { z } from 'zod'

export const openAppSchema = z.object({
  app: z.string()
})

export type OpenAppInput = z.infer<typeof openAppSchema>