import { getDb } from '../database'
import type { Question } from '../../../shared/types'

interface QuestionRow {
  id: number
  test_id: number
  text: string
  options: string
  correct_index: number
  explanation: string
  order_index: number
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    testId: row.test_id,
    text: row.text,
    options: JSON.parse(row.options) as string[],
    correctIndex: row.correct_index,
    explanation: row.explanation || undefined,
    orderIndex: row.order_index,
  }
}

export function getQuestionsByTestId(testId: number): Question[] {
  const db = getDb()
  const rows = db
    .prepare(`SELECT * FROM questions WHERE test_id = ? ORDER BY order_index ASC, id ASC`)
    .all(testId) as QuestionRow[]
  return rows.map(rowToQuestion)
}

export function getQuestionById(id: number): Question | null {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM questions WHERE id = ?`).get(id) as QuestionRow | undefined
  return row ? rowToQuestion(row) : null
}

export function createQuestion(
  testId: number,
  text: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  orderIndex: number
): Question {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO questions (test_id, text, options, correct_index, explanation, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(testId, text, JSON.stringify(options), correctIndex, explanation, orderIndex)
  return rowToQuestion({
    id: result.lastInsertRowid as number,
    test_id: testId,
    text,
    options: JSON.stringify(options),
    correct_index: correctIndex,
    explanation,
    order_index: orderIndex,
  })
}

export function updateQuestion(
  id: number,
  text: string,
  options: string[],
  correctIndex: number,
  explanation: string
): Question | null {
  const db = getDb()
  db.prepare(
    `UPDATE questions SET text = ?, options = ?, correct_index = ?, explanation = ? WHERE id = ?`
  ).run(text, JSON.stringify(options), correctIndex, explanation, id)
  return getQuestionById(id)
}

export function deleteQuestion(id: number): void {
  const db = getDb()
  db.prepare(`DELETE FROM questions WHERE id = ?`).run(id)
}

export function reorderQuestions(testId: number, orderedIds: number[]): void {
  const db = getDb()
  const update = db.prepare(`UPDATE questions SET order_index = ? WHERE id = ? AND test_id = ?`)
  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      update.run(index, id, testId)
    })
  })
  transaction()
}

export function bulkCreateQuestions(
  testId: number,
  questions: Omit<Question, 'id' | 'testId'>[]
): Question[] {
  const db = getDb()
  const existing = db
    .prepare(`SELECT MAX(order_index) as max_idx FROM questions WHERE test_id = ?`)
    .get(testId) as { max_idx: number | null }
  let startIndex = (existing.max_idx ?? -1) + 1

  const insert = db.prepare(
    `INSERT INTO questions (test_id, text, options, correct_index, explanation, order_index)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  const created: Question[] = []
  const transaction = db.transaction(() => {
    for (const q of questions) {
      const result = insert.run(
        testId,
        q.text,
        JSON.stringify(q.options),
        q.correctIndex,
        q.explanation ?? '',
        startIndex++
      )
      created.push({
        id: result.lastInsertRowid as number,
        testId,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        orderIndex: startIndex - 1,
      })
    }
  })
  transaction()
  return created
}
