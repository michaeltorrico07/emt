import { createClient } from '@libsql/client'

export const db = createClient({ url: 'file:./emt.db' })

await db.execute(`
  CREATE TABLE IF NOT EXISTS screen_analyses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,
    analysis    TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS summaries (
    session_id TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)
