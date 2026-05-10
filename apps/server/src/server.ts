import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { schemas } from '@packages/agent-tools'
import { extractJSON } from './extractJson.js'
import { ChatResponseSchema } from './chatRes.js'

const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

async function callLLM(prompt: string, system: string, retries = 2) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        system,
        prompt,
        stream: false,
      }),
    })

    const data = await res.json()
    console.log(data.response)
    const raw = extractJSON(data.response)

    const parsed = ChatResponseSchema.safeParse(raw)
    if (parsed.success) {
      return parsed.data
    }

    prompt += `\n\nIMPORTANT: your previous output was invalid JSON. Fix it strictly.`
  }

  return {
    type: "error",
    content: "No pude interpretar la respuesta del modelo",
  } as const
}

type ReqChat = {
  text: string
  apps: { id: string, name: string }[]
}

app.post('/chat', async (c) => {
  const { text, apps } = await c.req.json<ReqChat>()

  const appsContext = apps.map(a => `- ${a.name} (id: ${a.id})`).join("\n")
  const firstApp = apps[0]

  const toolsContext = schemas.map(a => {
    const props = a.jsonSchema.properties as Record<string, { type: string }>
    const inputExample = Object.entries(props)
      .map(([key, val]) => `"${key}": "<${key}-${val.type}>"`)
      .join(', ')
    return `- ${a.name}: ${a.description}. Input: { ${inputExample} }`
  }).join("\n")

const systemPrompt = `
You are a desktop assistant. Your ONLY job is to return valid JSON, nothing else.

## Tools available:
${toolsContext}

## Apps available:
${appsContext}

## IMPORTANT TOOL FORMAT RULES:
- ALL tool responses MUST include an "input" object
- Even if the tool requires no parameters, use:
  { "input": {} }
- NEVER omit the "input" field

## Rules:
- Match apps case-insensitively by name or id
- NEVER invent apps not in the list
- NEVER respond with prose, only JSON
- The "app" field must be the app's id, not its name

## Examples:
${firstApp ? `- "Open ${firstApp.name}" -> { "type": "tool", "tool": "open_app", "input": { "app": "${firstApp.id}" } }` : ''}

- "Take a screenshot" ->
{ "type": "tool", "tool": "capture_screenshot", "input": {} }

- "Open Photoshop" ->
{ "type": "error", "error": "APP_NOT_FOUND", "message": "The app 'Photoshop' is not available." }
`.trim()

  const userPrompt = `User request: ${text}`
  const result = await callLLM(userPrompt, systemPrompt)
  return c.json(result)
})

serve({
  fetch: app.fetch,
  port: 3000
})

console.log('Server running on http://localhost:3000')
