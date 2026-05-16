import { contextBridge, ipcRenderer } from 'electron'
import type {
  Test,
  Question,
  Session,
  SessionSettings,
  SessionAnswer,
} from '../shared/types'

const api = {
  // Tests
  getTests: (): Promise<Test[]> => ipcRenderer.invoke('tests:getAll'),

  createTest: (data: { name: string; description: string }): Promise<Test> =>
    ipcRenderer.invoke('tests:create', data.name, data.description),

  updateTest: (id: number, data: { name: string; description: string }): Promise<Test> =>
    ipcRenderer.invoke('tests:update', id, data.name, data.description),

  deleteTest: (id: number): Promise<void> => ipcRenderer.invoke('tests:delete', id),

  // Questions
  getQuestions: (testId: number): Promise<Question[]> =>
    ipcRenderer.invoke('questions:getByTest', testId),

  createQuestion: (data: Omit<Question, 'id'>): Promise<Question> =>
    ipcRenderer.invoke(
      'questions:create',
      data.testId,
      data.text,
      data.options,
      data.correctIndex,
      data.explanation ?? '',
      data.orderIndex
    ),

  updateQuestion: (id: number, data: Partial<Question>): Promise<Question> =>
    ipcRenderer.invoke(
      'questions:update',
      id,
      data.text,
      data.options,
      data.correctIndex,
      data.explanation ?? ''
    ),

  deleteQuestion: (id: number): Promise<void> => ipcRenderer.invoke('questions:delete', id),

  reorderQuestions: (testId: number, orderedIds: number[]): Promise<void> =>
    ipcRenderer.invoke('questions:reorder', testId, orderedIds),

  bulkCreateQuestions: (
    testId: number,
    questions: Omit<Question, 'id' | 'testId'>[]
  ): Promise<Question[]> => ipcRenderer.invoke('questions:bulkCreate', testId, questions),

  importQuestions: (
    testId: number,
    filePath: string
  ): Promise<Omit<Question, 'id' | 'testId'>[]> =>
    ipcRenderer.invoke('questions:import', testId, filePath),

  openFilePicker: (): Promise<string | null> =>
    ipcRenderer.invoke('questions:openFilePicker'),

  // Sessions
  startSession: (testId: number, settings: SessionSettings): Promise<Session> =>
    ipcRenderer.invoke('sessions:start', testId, settings),

  saveAnswer: (sessionId: number, answer: SessionAnswer): Promise<void> =>
    ipcRenderer.invoke('sessions:saveAnswer', sessionId, answer),

  completeSession: (sessionId: number): Promise<Session> =>
    ipcRenderer.invoke('sessions:complete', sessionId),

  getSession: (sessionId: number): Promise<Session> =>
    ipcRenderer.invoke('sessions:get', sessionId),

  getSessionHistory: (testId: number): Promise<Session[]> =>
    ipcRenderer.invoke('sessions:history', testId),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
