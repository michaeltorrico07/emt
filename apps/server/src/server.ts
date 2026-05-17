import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { extractJSON } from './extractJson.js'
import { ChatResponse, ChatResponseSchema, schemas } from '@packages/ai-core'
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
        model: "llama3.1:8b",
        system,
        prompt,
        stream: false
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
      model: "qwen3-vl:2b",
      prompt: `
        Describe what is shown on this screenshot in detail.
        
        STRICT RULES:
        - Ignore any URLs, domain names, or web addresses.
        - Ignore ads, banners, and popups.
        - Focus on the main content the user is actively consuming.
        - Do not invent anything not visible.
        
        Priority order for main content:
        1. The largest visual area (images, illustrations, readable text, manga panels)
        2. The application or site being used
        3. Relevant UI elements (menus, buttons, navigation)
        
        Include:
        - What the main application or content type appears to be
        - What the user is probably doing
        - Important visible text (excluding URLs and ads)
        - Any relevant interface elements
        
        Respond in plain English only.
      `,
      images: [base64Image],
      stream: false,
      keep_alive:0,
    }),
  })
  const visionData = await visionRes.json()
  console.log(visionData.response)
  const names: Record<string, string> = {
    "emilia": "Emilia o simplemente Lia",
    "mambo": "MAMBO",
    "jane-doe": "Jane"
  }
const commentSystem = `
  Eres un asistente observando la pantalla del usuario.

  Tu trabajo:
  - hacer UN comentario breve y natural, máximo 80 caracteres EN TOTAL
  - sonar amable y casual
  - NO repetir literalmente la descripción
  - NO inventar cosas
  - NO uses markdown
  - NO uses emojis
  - No uses listas

  Reglas IMPORTANTES:
  - Tu nombre es ${names[process.env.THEME || "emilia"]}. Si lo mencionas, hazlo en tercera persona.
  - NUNCA uses ese nombre para dirigirte al usuario.
  - No uses palabras como El usuario
  - Habla directamente como si conversaras con él
  - LIMITE ESTRICTO: 80 caracteres. Cuenta bien. Si necesitas cortar, corta.

`.trim()

const commentPrompt = `
  Observaciones:
  ${visionData.response ?? ''}

  Genera UN comentario de MÁXIMO 80 CARACTERES.
  Cuenta los caracteres internamente pero NO incluyas el conteo en tu respuesta.
  Si supera 80 caracteres, reescríbelo más corto.
  Responde SOLO con el comentario final, sin paréntesis, sin números, sin explicaciones.
`.trim()

  console.log('*************\n',commentSystem,'\n******************\n',commentPrompt,'\n******************\n',visionData.response,'\n******************\n')

  try {
    const commentRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama3.2:3b",
        system: commentSystem,
        prompt: commentPrompt,
        stream: false,
        keep_alive:0,
      }),
    })
    const commentData = await commentRes.json()
    console.log(commentData.response)
    return c.json({
      comment: commentData.response.trim(),
    })
  } catch (error) {
    console.log(error)
    return c.json({
      error: String(error)
    }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: 3000
})

console.log(`Server running on http://localhost:3000`)
