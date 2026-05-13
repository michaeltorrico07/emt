import { z } from 'zod'
import { schemas } from '@packages/agent-tools'

function makeToolObject<const Name extends string, const Schema extends z.ZodTypeAny>(tool: { readonly name: Name; readonly zodSchema: Schema }) {
  return z.object({
    type: z.literal('tool'),
    tool: z.literal(tool.name),
    input: tool.zodSchema,
    message: z.string(),
  })
}

type ToolObject<T> =
  T extends {
    readonly name: infer Name extends string
    readonly zodSchema: infer Schema extends z.ZodTypeAny
  }
    ? ReturnType<typeof makeToolObject<Name, Schema>>
    : never

function buildToolSchema<
  const T extends readonly {
    readonly name: string
    readonly zodSchema: z.ZodTypeAny
  }[]
>(schemas: T) {
  const objects = schemas.map(
    tool => makeToolObject(tool)
  ) as unknown as {
    [K in keyof T]: ToolObject<T[K]>
  }

  return z.union(objects)
}

export const ToolSchema = buildToolSchema(schemas)

export const ChatResponseSchema = z.union([
  z.object({
    type: z.literal('ValidationError'),
    error: z.literal(true),
    message: z.string(),
  }),
  ToolSchema,
])

export type ChatResponse = z.infer<typeof ChatResponseSchema>
