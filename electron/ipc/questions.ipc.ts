import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as questionRepo from '../db/repositories/question.repo'
import type { Question } from '../../shared/types'

function parsePlainText(text: string): Omit<Question, 'id' | 'testId'>[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const results: Omit<Question, 'id' | 'testId'>[] = []
  let i = 0
  while (i < lines.length) {
    const match = lines[i].match(/^(\d+)[.)]\s+(.+)/)
    if (!match) { i++; continue }
    const questionText = match[2]
    i++
    const options: string[] = []
    let correctIndex = 0
    while (options.length < 4 && i < lines.length) {
      const line = lines[i]
      // Bold marker from mammoth or asterisk prefix
      if (line.startsWith('**') && line.endsWith('**')) {
        const clean = line.slice(2, -2).replace(/^[A-D][.)]\s*/i, '')
        correctIndex = options.length
        options.push(clean)
      } else if (line.startsWith('*') && !line.startsWith('**')) {
        const clean = line.slice(1).replace(/^[A-D][.)]\s*/i, '')
        correctIndex = options.length
        options.push(clean)
      } else {
        const clean = line.replace(/^[A-D][.)]\s*/i, '')
        options.push(clean)
      }
      i++
    }
    if (options.length === 4) {
      results.push({
        text: questionText,
        options,
        correctIndex,
        explanation: '',
        orderIndex: results.length,
      })
    }
  }
  return results
}

export function registerQuestionHandlers(): void {
  ipcMain.handle('questions:getByTest', (_e, testId: number) =>
    questionRepo.getQuestionsByTestId(testId)
  )

  ipcMain.handle(
    'questions:create',
    (
      _e,
      testId: number,
      text: string,
      options: string[],
      correctIndex: number,
      explanation: string,
      orderIndex: number
    ) => questionRepo.createQuestion(testId, text, options, correctIndex, explanation, orderIndex)
  )

  ipcMain.handle(
    'questions:update',
    (
      _e,
      id: number,
      text: string,
      options: string[],
      correctIndex: number,
      explanation: string
    ) => questionRepo.updateQuestion(id, text, options, correctIndex, explanation)
  )

  ipcMain.handle('questions:delete', (_e, id: number) => {
    questionRepo.deleteQuestion(id)
  })

  ipcMain.handle('questions:reorder', (_e, testId: number, orderedIds: number[]) => {
    questionRepo.reorderQuestions(testId, orderedIds)
  })

  ipcMain.handle(
    'questions:bulkCreate',
    (_e, testId: number, questions: Omit<Question, 'id' | 'testId'>[]) =>
      questionRepo.bulkCreateQuestions(testId, questions)
  )

  ipcMain.handle('questions:import', async (_e, _testId: number, filePath: string) => {
    let text = ''
    if (filePath.endsWith('.docx')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mammoth = require('mammoth') as typeof import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      text = result.value
    } else {
      text = fs.readFileSync(filePath, 'utf-8')
    }
    return parsePlainText(text)
  })

  ipcMain.handle('questions:openFilePicker', async (e) => {
    const win = require('electron').BrowserWindow.fromWebContents(e.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [
        { name: 'Documents', extensions: ['docx', 'txt'] },
      ],
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
