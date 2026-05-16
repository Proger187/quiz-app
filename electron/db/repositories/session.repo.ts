import { getDb } from '../database'
import type { Session, SessionSettings, SessionAnswer, SessionQuestion } from '../../../shared/types'

interface SessionRow {
  id: number
  test_id: number
  settings: string
  questions: string
  answers: string
  score: number | null
  started_at: string
  completed_at: string | null
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    testId: row.test_id,
    settings: JSON.parse(row.settings) as SessionSettings,
    questions: JSON.parse(row.questions) as SessionQuestion[],
    answers: JSON.parse(row.answers) as SessionAnswer[],
    score: row.score ?? undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
  }
}

export function createSession(
  testId: number,
  settings: SessionSettings,
  questions: SessionQuestion[]
): Session {
  const db = getDb()
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO sessions (test_id, settings, questions, answers, started_at)
       VALUES (?, ?, ?, '[]', ?)`
    )
    .run(testId, JSON.stringify(settings), JSON.stringify(questions), now)
  return rowToSession({
    id: result.lastInsertRowid as number,
    test_id: testId,
    settings: JSON.stringify(settings),
    questions: JSON.stringify(questions),
    answers: '[]',
    score: null,
    started_at: now,
    completed_at: null,
  })
}

export function getSessionById(id: number): Session | null {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow | undefined
  return row ? rowToSession(row) : null
}

export function saveAnswer(sessionId: number, answer: SessionAnswer): void {
  const db = getDb()
  const row = db
    .prepare(`SELECT answers FROM sessions WHERE id = ?`)
    .get(sessionId) as { answers: string } | undefined
  if (!row) return
  const answers = JSON.parse(row.answers) as SessionAnswer[]
  answers.push(answer)
  db.prepare(`UPDATE sessions SET answers = ? WHERE id = ?`).run(
    JSON.stringify(answers),
    sessionId
  )
}

export function completeSession(sessionId: number): Session | null {
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as SessionRow | undefined
  if (!row) return null

  const answers = JSON.parse(row.answers) as SessionAnswer[]
  const questions = JSON.parse(row.questions) as SessionQuestion[]
  const total = questions.length
  const correct = answers.filter((a) => a.isCorrect).length
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const now = new Date().toISOString()

  db.prepare(`UPDATE sessions SET score = ?, completed_at = ? WHERE id = ?`).run(
    score,
    now,
    sessionId
  )
  return getSessionById(sessionId)
}

export function getSessionHistory(testId: number, limit = 3): Session[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM sessions WHERE test_id = ? AND completed_at IS NOT NULL
       ORDER BY completed_at DESC LIMIT ?`
    )
    .all(testId, limit) as SessionRow[]
  return rows.map(rowToSession)
}
