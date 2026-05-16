export type { Test, Question, Session, SessionSettings, SessionAnswer, SessionQuestion } from '../../shared/types'

import type { Api } from '../../electron/preload'

declare global {
  interface Window {
    api: Api
  }
}
