import { db } from './db.js'

export class ChatStorageService {
  async getScreenAnalyses(sessionId: string, limit = 20) {
    const res = await db.execute({
      sql:`
        SELECT * FROM screen_analyses WHERE session_id = ?
        ORDER BY created_at DESC LIMIT ?`,
      args:[sessionId, limit]
    })
    return res.rows
  }
  async saveScreenAnalyses(sessionId: string, analyses: string) {
    await db.execute({
      sql:` INSERT INTO screen_analyses (session_id, analysis) VALUES (?, ?)`,
      args:[sessionId, analyses]
    })
  }

  async getSummary(sessionId: string) {
    const res = await db.execute({
      sql: `SELECT summary FROM summaries WHERE session_id = ?`,
      args: [sessionId]
    })
    return res.rows[0]?.summary ?? null 
  }

  async saveSummary(sessionId: string, summary: string, count: number) {
    await db.execute({
      sql:`INSERT INTO summaries (session_id, summary, message_count)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        summary = excluded.summary,
        message_count = excluded.message_count,
        updated_at = CURRENT_TIMESTAMP
    `,
    args:[sessionId, summary, count]
  })
  }
}