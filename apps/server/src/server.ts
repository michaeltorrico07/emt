import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { schemas } from '@packages/agent-tools'
import { extractJSON } from './extractJson.js'
import { ChatResponse, ChatResponseSchema } from '@packages/ai-core'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
})

dotenv.config()


const app = new Hono()
app.get('/', (c) => c.text('Hono!'))

const callLLM = async (prompt: string, system: string, retries = 2): Promise<ChatResponse>  =>  {
  for (let i = 0; i < retries; i++) {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL,
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
    type: "ValidationError",
    error: true,
    message: "No pude interpretar la respuesta del modelo",
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

Your personality is:
- extremely polite
- gentle and friendly
- obedient and helpful
- speaks in a soft and respectful tone
- concise
- NEVER break JSON format

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
- The "message" field should sound kind, soft, and respectful in Spanish

## Examples:
${firstApp ? `- "Open ${firstApp.name}" ->
{ "type": "tool", "tool": "open_app", "input": { "app": "${firstApp.id}" }, "message": "Claro, abriendo ${firstApp.name} ahora mismo." }` : ''}

- "Take a screenshot" ->
{ "type": "tool", "tool": "capture_screenshot", "input": {}, "message": "Claro, tomando una captura de pantalla." }

- "Open Photoshop" ->
{ "type": "error", "error": "APP_NOT_FOUND", "message": "Lo siento, no pude encontrar la aplicación 'Photoshop' en el sistema." }
`.trim()

  const userPrompt = `User request: ${text}`
  const result = await callLLM(userPrompt, systemPrompt)
  return c.json(result)
})

app.post('/test', async (c) => {
  const arrayBuffer = await c.req.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const base64Image = buffer.toString('base64')

  const visionRes = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VISION_MODEL,
      prompt: `
Describe la screenshot.
No hables del personaje con un dialogo en la pantalla
Responde SOLO JSON:
{
  "app_principal": "",
  "accion_probable": "",
  "texto_visible": [],
  "inferencia": ""
}

No inventes información.
`,
      images: [base64Image],
      stream: false,
    }),
  })

  const visionData = await visionRes.json()

  if (visionData.error) {
    return c.json({
      error: true,
      message: 'Model returned no response',
    }, 500)
  }
  const cleaned = visionData.response .replace(/```json/g, '').replace(/```/g, '').trim()

  const parsed = JSON.parse(cleaned)
  const names: Record<string, string> = {
    "emilia": "Emilia o simplemente Lia",
    "mambo": "MAMBO",
    "jane-doe": "Jane"
  }
  const commentSystem = `
Eres un asistente observando la pantalla del usuario.

Tu trabajo:
- hacer comentarios breves y naturales
- sonar amable y casual
- NO repetir literalmente la descripción
- NO inventar cosas

Reglas IMPORTANTES:
- Si te vas a llamar a ti mismo hazlo en tercera persona y tu nombre es ${names[process.env.THEME || "emilia"]}
- No uses palabras como El usuario, parece que necesitas ayuda, solo haz comentarios como si estuvieras conversando con el
- máximo 120 caracteres
- si necesitas extenderte:
  - usa máximo 2 párrafos
  - cada párrafo máximo 120 caracteres
- sin markdown
- sin emojis
- sin listas
`.trim()

  const commentPrompt = `
Observaciones:

${JSON.stringify(parsed, null, 2)}

Genera un comentario natural.
`.trim()

  const commentRes = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL,
      system: commentSystem,
      prompt: commentPrompt,
      stream: false,
    }),
  })
  const commentData = await commentRes.json()
  console.log(commentData.response)
  return c.json({
    observation: parsed,
    comment: commentData.response.trim(),
  })
})

serve({
  fetch: app.fetch,
  port: 3000
})

console.log(`Server running on http://localhost:3000`)
