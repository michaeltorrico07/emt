import { jsonAppSchema, openAppSchema } from './schema.js'

export const openApp = {
  name: 'open_app',
  description: 'Open a desktop application installed on the user system',
  jsonSchema: jsonAppSchema,
  zodSchema: openAppSchema
} as const