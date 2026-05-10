import { z } from 'zod'
import { schemas } from '@packages/agent-tools'

function buildToolSchema(schemas: typeof import('@packages/agent-tools').schemas) {
  const [first, ...rest] = schemas.map((tool) =>
    z.object({
      type: z.literal('tool'),
      tool: z.literal(tool.name),
      input: tool.zodSchema,
    })
  )

  return z.discriminatedUnion('tool', [first, ...rest])
}

const ToolSchema = buildToolSchema(schemas)

export const ChatResponseSchema = z.union([
  z.object({
    type: z.literal('error'),
    error: z.string(),
    message: z.string(),
  }),
  ToolSchema,
])
