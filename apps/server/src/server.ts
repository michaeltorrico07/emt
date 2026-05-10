import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

app.get('/test', async (c) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'phi3',
      prompt: 'hola',
      stream: false
    })
  })
  const data = await response.json()
  return c.json(data)
})

app.get('/test-lol', async (c) => c.json({
  type: 'tool_call',
  tool: 'open_app',
  arguments: {
    app: 'steam://rungameid/1229490'
  }
}))

serve({
  fetch: app.fetch,
  port: 3000
})

console.log('Server running on http://localhost:3000')
