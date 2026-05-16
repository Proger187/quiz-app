import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'quiz-app.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run migrations (idempotent — all statements use IF NOT EXISTS)
  db.exec(SCHEMA_SQL)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
