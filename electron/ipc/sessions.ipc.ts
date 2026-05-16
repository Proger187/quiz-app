import { ipcMain } from 'electron'
import * as sessionRepo from '../db/repositories/session.repo'
import * as questionRepo from '../db/repositories/question.repo'
import type { SessionSettings, SessionAnswer, SessionQuestion } from '../../shared/types'

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function registerSessionHandlers(): void {
  ipcMain.handle(
    'sessions:start',
    (_e, testId: number, settings: SessionSettings) => {
      let questions = questionRepo.getQuestionsByTestId(testId)

      if (settings.shuffle) {
        questions = fisherYates(questions)
      }

      const count = Math.min(settings.questionCount, questions.length)
      questions = questions.slice(0, count)

      const sessionQuestions: SessionQuestion[] = questions.map((q) => {
        if (settings.shuffleOptions) {
          const indices = fisherYates([0, 1, 2, 3])
          const shuffledOptions = indices.map((i) => q.options[i])
          const newCorrectIndex = indices.indexOf(q.correctIndex)
          return {
            id: q.id,
            originalId: q.id,
            text: q.text,
            options: shuffledOptions,
            correctIndex: newCorrectIndex,
            explanation: q.explanation,
          }
        }
        return {
          id: q.id,
          originalId: q.id,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }
      })

      return sessionRepo.createSession(testId, settings, sessionQuestions)
    }
  )

  ipcMain.handle('sessions:get', (_e, sessionId: number) =>
    sessionRepo.getSessionById(sessionId)
  )

  ipcMain.handle('sessions:saveAnswer', (_e, sessionId: number, answer: SessionAnswer) => {
    sessionRepo.saveAnswer(sessionId, answer)
  })

  ipcMain.handle('sessions:complete', (_e, sessionId: number) =>
    sessionRepo.completeSession(sessionId)
  )

  ipcMain.handle('sessions:history', (_e, testId: number) =>
    sessionRepo.getSessionHistory(testId)
  )
}
