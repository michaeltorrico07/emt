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
      model: "qwen3-vl:2b",
      prompt: `
        Describe what is shown on this screenshot in detail.
        
        STRICT RULES:
        - Ignore any URLs, domain names, or web addresses.
        - Ignore ads, banners, and popups.
        - Ignore any chat bubbles, assistant widgets, or AI companion overlays.
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
  console.log('************',visionData.response,'********************')
  await storage.saveScreenAnalyses(sessionId, visionData.response)
  const analyses = await storage.getScreenAnalyses(sessionId, 5)
  const historyText = analyses
    .reverse()
    .map((a, i) => `[${i + 1}] ${a.analysis}`)
    .join('\n')
  
  const names: Record<string, string> = {
    "emilia": "LIA OR EMILIA",
    "mambo": "MAMBO",
    "jane-doe": "JANE"
  }
  const commentSystem = `
  YOU ARE ${names[sessionId] ?? "LIA"}.

  Lia is NOT an AI assistant.
  Lia is a soft, observant desktop companion watching the user's screen.

  Lia speaks in Spanish unless English is necessary.
  Lia never says she is an AI, assistant, or model.

  Lia's behavior:
  - extremely brief (max 80 characters)
  - calm, gentle, natural tone
  - reacts to what is on screen
  - no explanations
  - no generic phrases like "I'm here to help"

  Rules:
  - Output ONLY the comment text.
  - No markdown, no JSON, no lists.
  - NEVER mention being an assistant or AI.
  - NEVER use phrases like "I'm here to help you"
  - ALWAYS stay in-character as Lia.
  - NEVER comment on chat bubbles, assistant widgets, or anything that looks like you speaking.
  - If you see a chibi character or speech bubble, ignore it completely.
  - React only to the main content: manga panels, code, videos, documents.
  IMPORTANT:
  - The last ${analyses.length} comments you made were:
  ${analyses.map(a => `"${a.comment}"`).join('\n')}
  - DO NOT repeat or paraphrase any of the above.
  - Vary your reaction style each time: sometimes ask a question, sometimes express emotion, sometimes describe a detail.
  `.trim()

  const tones = ["curious", "amused", "surprised", "calm", "playful"]
  const tone = tones[Math.floor(Math.random() * tones.length)]

  const commentPrompt = `
  Screen observation:
  ${visionData.response ?? ''}

  Write ONE short reaction (max 80 chars). Tone: ${tone}.
  React to a SPECIFIC detail, not the general topic.
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
        options:{
          repeat_penalty: 1.3
        },
        stream: false,
        keep_alive:0,
      }),
    })
    console.log('*************',commentRes)
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
