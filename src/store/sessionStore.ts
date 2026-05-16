import { create } from 'zustand'
import type { Session, SessionAnswer } from '../types'

interface SessionState {
  session: Session | null
  currentIndex: number
  localAnswers: SessionAnswer[]
  startTime: number
  setSession: (session: Session) => void
  advance: () => void
  recordLocalAnswer: (answer: SessionAnswer) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  currentIndex: 0,
  localAnswers: [],
  startTime: Date.now(),

  setSession: (session) => set({ session, currentIndex: 0, localAnswers: [], startTime: Date.now() }),

  advance: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),

  recordLocalAnswer: (answer) =>
    set((s) => ({ localAnswers: [...s.localAnswers, answer] })),

  reset: () => set({ session: null, currentIndex: 0, localAnswers: [], startTime: Date.now() }),
}))
