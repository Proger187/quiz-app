import { ipcMain } from 'electron'
import * as testRepo from '../db/repositories/test.repo'

export function registerTestHandlers(): void {
  ipcMain.handle('tests:getAll', () => testRepo.getAllTests())

  ipcMain.handle('tests:create', (_e, name: string, description: string) =>
    testRepo.createTest(name, description)
  )

  ipcMain.handle('tests:update', (_e, id: number, name: string, description: string) =>
    testRepo.updateTest(id, name, description)
  )

  ipcMain.handle('tests:delete', (_e, id: number) => {
    testRepo.deleteTest(id)
  })
}
