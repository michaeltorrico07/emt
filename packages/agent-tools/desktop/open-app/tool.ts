import { openAppSchema } from './schema.js'
import { execute } from './execute.js'

export const openAppTool = {
  name: 'open_app',

  description:
    'Open a desktop application installed on the user system',

  schema: openAppSchema,

  execute
}