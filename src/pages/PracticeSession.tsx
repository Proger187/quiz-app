import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, X, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { useSessionStore } from '../store/sessionStore'
import type { SessionQuestion, SessionAnswer } from '../types'
import { cn } from '../lib/utils'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

// ─── Option button ────────────────────────────────────────────────────────────

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

interface OptionButtonProps {
  label: string
  text: string
  state: OptionState
  disabled: boolean
  onClick: () => void
}

function OptionBtn({ label, text, state, disabled, onClick }: OptionButtonProps) {
  const base =
    'w-full text-left flex items-start gap-3 rounded-lg border-2 p-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  const styles: Record<OptionState, string> = {
    idle: 'border-border bg-card hover:bg-accent hover:border-primary cursor-pointer',
    selected: 'border-primary bg-primary/10 cursor-default',
    correct: 'border-green-500 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 cursor-default',
    wrong: 'border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 cursor-default',
  }

  const icons: Partial<Record<OptionState, React.ReactNode>> = {
    correct: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />,
    wrong: <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
  }

  return (
    <button
      className={cn(base, styles[state], disabled && state === 'idle' && 'opacity-50 cursor-not-allowed')}
      onClick={onClick}
      disabled={disabled}
      role="radio"
      aria-checked={state !== 'idle'}
      aria-label={`Option ${label}: ${text}`}
    >
      <span className="shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold leading-none">
        {label}
      </span>
      <span className="flex-1">{text}</span>
      {icons[state]}
    </button>
  )
}

// ─── Main session page ─────────────────────────────────────────────────────────

export default function PracticeSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, currentIndex, setSession, advance, recordLocalAnswer, reset } = useSessionStore()

  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const questionStartRef = useRef<number>(Date.now())

  // ── Derived values computed safely regardless of session being null ─────────
  const questions = session?.questions ?? []
  const total = questions.length
  const current: SessionQuestion | undefined = questions[currentIndex]
  const settings = session?.settings
  const isLast = currentIndex === total - 1
  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0
  const canAdvance = settings?.immediatelyFeedback ? revealed : selectedIndex !== null

  // ── Load session on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    window.api
      .getSession(Number(sessionId))
      .then((s) => {
        setSession(s)
        setLoading(false)
        questionStartRef.current = Date.now()
      })
      .catch(() => {
        toast.error('Failed to load session')
        navigate('/')
      })
    return () => reset()
    // reset identity is stable; sessionId is the only real dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ── handleSelect (regular function, no hook) ────────────────────────────────
  function handleSelect(optIdx: number) {
    if (!current || !settings) return
    if (selectedIndex !== null) return
    if (settings.immediatelyFeedback && revealed) return

    setSelectedIndex(optIdx)

    if (settings.immediatelyFeedback) {
      setRevealed(true)
    } else {
      const answer: SessionAnswer = {
        questionId: current.id,
        selectedIndex: optIdx,
        isCorrect: optIdx === current.correctIndex,
        timeSpentMs: Date.now() - questionStartRef.current,
      }
      recordLocalAnswer(answer)
    }
  }

  // ── handleNext (useCallback BEFORE any conditional return) ──────────────────
  const handleNext = useCallback(async () => {
    if (selectedIndex === null || !current || finishing) return

    const answer: SessionAnswer = {
      questionId: current.id,
      selectedIndex,
      isCorrect: selectedIndex === current.correctIndex,
      timeSpentMs: Date.now() - questionStartRef.current,
    }

    try {
      await window.api.saveAnswer(Number(sessionId), answer)
    } catch {
      toast.error('Failed to save answer')
      return
    }

    if (isLast) {
      setFinishing(true)
      try {
        await window.api.completeSession(Number(sessionId))
        navigate(`/results/${sessionId}`)
      } catch {
        toast.error('Failed to complete session')
        setFinishing(false)
      }
    } else {
      advance()
      setSelectedIndex(null)
      setRevealed(false)
      questionStartRef.current = Date.now()
    }
  }, [selectedIndex, current, sessionId, isLast, finishing, advance, navigate])

  // ── Keyboard shortcuts (useEffect BEFORE any conditional return) ────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!session || !current) return

      const numMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 }
      const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }
      const optIdx = numMap[e.key] ?? letterMap[e.key.toLowerCase()]

      if (optIdx !== undefined && selectedIndex === null) {
        handleSelect(optIdx)
        return
      }
      if ((e.key === 'Enter' || e.key === ' ') && canAdvance) {
        e.preventDefault()
        handleNext()
        return
      }
      if (e.key === 'Escape') {
        setExitOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Option display state ────────────────────────────────────────────────────
  function optionState(i: number): OptionState {
    if (!current) return 'idle'
    if (!revealed) return selectedIndex === i ? 'selected' : 'idle'
    if (i === current.correctIndex) return 'correct'
    if (i === selectedIndex) return 'wrong'
    return 'idle'
  }

  // ── Early return after ALL hooks ────────────────────────────────────────────
  if (loading || !session || !current || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading session…</p>
      </div>
    )
  }

  const isDisabled = (i: number) => {
    if (settings.immediatelyFeedback) return revealed
    return selectedIndex !== null && selectedIndex !== i
  }

  const showExplanation =
    settings.immediatelyFeedback && settings.showExplanation && revealed && !!current.explanation

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Controlled exit dialog */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit session?</AlertDialogTitle>
            <AlertDialogDescription>Your progress will be lost. Exit anyway?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue practising</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => navigate('/')}
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Exit session"
            onClick={() => setExitOpen(true)}
          >
            <X className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentIndex + 1} / {total}
          </span>
        </div>
        {settings.immediatelyFeedback && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Immediate feedback
          </div>
        )}
      </header>

      {/* Progress bar */}
      {settings.showProgressBar && (
        <Progress value={progressPct} className="h-1.5 rounded-none shrink-0" />
      )}

      {/* Body */}
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Animated question container */}
        <div key={currentIndex} className="question-animate space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Question {currentIndex + 1}
            </p>
            <h2 className="text-xl font-semibold leading-snug">{current.text}</h2>
          </div>

          <div className="space-y-3" role="radiogroup" aria-label="Answer options">
            {current.options.map((opt, i) => (
              <OptionBtn
                key={i}
                label={OPTION_LABELS[i]}
                text={opt}
                state={optionState(i)}
                disabled={isDisabled(i)}
                onClick={() => handleSelect(i)}
              />
            ))}
          </div>

          {showExplanation && (
            <div className="rounded-md bg-muted border px-4 py-3 text-sm space-y-1">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Explanation
              </p>
              <p>{current.explanation}</p>
            </div>
          )}

          {canAdvance && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleNext} disabled={finishing} size="lg">
                {isLast ? (finishing ? 'Finishing…' : 'Finish') : 'Next'}
                {!isLast && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
