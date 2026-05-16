import { create } from 'zustand'
import type { Test } from '../types'

interface TestsState {
  tests: Test[]
  loading: boolean
  fetch: () => Promise<void>
  addTest: (test: Test) => void
  updateTest: (test: Test) => void
  removeTest: (id: number) => void
}

export const useTestsStore = create<TestsState>((set) => ({
  tests: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const tests = await window.api.getTests()
      set({ tests })
    } finally {
      set({ loading: false })
    }
  },

  addTest: (test) => set((s) => ({ tests: [test, ...s.tests] })),

  updateTest: (test) =>
    set((s) => ({ tests: s.tests.map((t) => (t.id === test.id ? test : t)) })),

  removeTest: (id) => set((s) => ({ tests: s.tests.filter((t) => t.id !== id) })),
}))
