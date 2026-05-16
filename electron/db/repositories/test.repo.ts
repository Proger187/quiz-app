import { getDb } from '../database'
import type { Test } from '../../../shared/types'

interface TestRow {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
  question_count?: number
}

function rowToTest(row: TestRow): Test {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    questionCount: row.question_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAllTests(): Test[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT t.*, COUNT(q.id) as question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       GROUP BY t.id
       ORDER BY t.updated_at DESC`
    )
    .all() as TestRow[]
  return rows.map(rowToTest)
}

export function getTestById(id: number): Test | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT t.*, COUNT(q.id) as question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       WHERE t.id = ?
       GROUP BY t.id`
    )
    .get(id) as TestRow | undefined
  return row ? rowToTest(row) : null
}

export function createTest(name: string, description: string): Test {
  const db = getDb()
  const now = new Date().toISOString()
  const result = db
    .prepare(`INSERT INTO tests (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`)
    .run(name, description, now, now)
  return rowToTest({
    id: result.lastInsertRowid as number,
    name,
    description,
    created_at: now,
    updated_at: now,
    question_count: 0,
  })
}

export function updateTest(id: number, name: string, description: string): Test | null {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`UPDATE tests SET name = ?, description = ?, updated_at = ? WHERE id = ?`).run(
    name,
    description,
    now,
    id
  )
  return getTestById(id)
}

export function deleteTest(id: number): void {
  const db = getDb()
  db.prepare(`DELETE FROM tests WHERE id = ?`).run(id)
}
