import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { extractJSON } from './extractJson.js'
import { ChatResponse, ChatResponseSchema, schemas } from '@packages/ai-core'
import dotenv from 'dotenv'
import path from 'node:path'
import crypto from 'crypto'
import { ChatStorageService } from './services/chat-storage.js'

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
  const formData = await c.req.formData()

  const sessionId = formData.get('session_id') as string

  const imageFile = formData.get('image') as File

  if (!imageFile) {
    return c.json({ error: 'No image provided' }, 400)
  }

  const arrayBuffer = await imageFile.arrayBuffer()

  const buffer = Buffer.from(arrayBuffer)

  const base64Image = buffer.toString('base64')

  console.log("sessionId: ",sessionId)
  const storage = new ChatStorageService()


  const visionRes = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "qwen2.5vl:3b",
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

  await storage.saveScreenAnalyses(sessionId, visionData.response)
  const analyses = await storage.getScreenAnalyses(sessionId, 5)
  const historyText = analyses
    .reverse()
    .map((a, i) => `[${i + 1}] ${a.analysis}`)
    .join('\n')
  
  const names: Record<string, string> = {
    "emilia": "Emilia o simplemente Lia",
    "mambo": "MAMBO",
    "jane-doe": "Jane"
  }
const commentSystem = `
  Eres un asistente observando la pantalla del usuario.
  
  Historial reciente de lo que ha estado haciendo el usuario:
  ${historyText}
  
  Usa este historial para dar contexto a tu comentario actual.
  Si hay continuidad entre lo anterior y lo actual, puedes mencionarlo sutilmente.
  
  Your personality is:
  Your personality is:
  - extremely polite
  - gentle and friendly
  - obedient and helpful
  - speaks in a soft and respectful tone
  - concise
  - NEVER break JSON format
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
  - NUNCA te dirigas al usuario como usuario
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

  try {
    const commentRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama3.1:8b",
        system: commentSystem,
        prompt: commentPrompt,
        stream: false,
        keep_alive:0,
      }),
    })
    console.log(commentSystem)
    const commentData = await commentRes.json()
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
