import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Home, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import type { Session, SessionAnswer, SessionQuestion, Test } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function scoreColor(pct: number): { ring: string; text: string; bg: string } {
  if (pct >= 80) return { ring: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' }
  if (pct >= 60) return { ring: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-50' }
  return { ring: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ pct }: { pct: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  const { ring, text } = scoreColor(pct)

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="-rotate-90">
        {/* Track */}
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        {/* Arc */}
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold leading-none', text)}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── Single answer review row ─────────────────────────────────────────────────

interface ReviewRowProps {
  index: number
  question: SessionQuestion
  answer: SessionAnswer | undefined
}

function ReviewRow({ index, question, answer }: ReviewRowProps) {
  const selectedIdx = answer?.selectedIndex ?? -1
  const skipped = selectedIdx === -1

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-medium text-sm">
        <span className="text-muted-foreground mr-2">{index + 1}.</span>
        {question.text}
      </p>

      {skipped ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MinusCircle className="w-4 h-4" />
          <span>Skipped</span>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex
            const isChosen = i === selectedIdx
            const isWrong = isChosen && !isCorrect

            return (
              <li
                key={i}
                className={cn(
                  'flex items-start gap-2 text-sm rounded-md px-2 py-1',
                  isCorrect && 'bg-green-50 text-green-800',
                  isWrong && 'bg-red-50 text-red-800'
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                ) : isWrong ? (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span>
                  <span className="font-mono font-semibold mr-1">{OPTION_LABELS[i]}.</span>
                  {opt}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {question.explanation && (
        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground border">
          <span className="font-semibold">Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  )
}

// ─── Results page ─────────────────────────────────────────────────────────────

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    Promise.all([
      window.api.getSession(Number(sessionId)),
      window.api.getTests(),
    ]).then(([s, tests]) => {
      setSession(s)
      setTest(tests.find((t) => t.id === s.testId) ?? null)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load results')
      navigate('/')
    })
  }, [sessionId, navigate])

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading results…</p>
      </div>
    )
  }

  const { questions, answers, settings, score = 0, startedAt, completedAt } = session
  const correct = answers.filter((a) => a.isCorrect).length
  const total = questions.length
  const timeTaken = completedAt
    ? formatTime(new Date(completedAt).getTime() - new Date(startedAt).getTime())
    : '—'
  const { text: scoreText, bg: scoreBg } = scoreColor(score)

  // Build answer map for quick lookup
  const answerMap = new Map<number, SessionAnswer>()
  answers.forEach((a) => answerMap.set(a.questionId, a))

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-xl font-bold">{test?.name ?? 'Results'}</h1>
        <p className="text-xs text-muted-foreground">Session complete</p>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        {/* Score summary */}
        <div className={cn('rounded-xl border p-6 flex flex-col sm:flex-row items-center gap-6', scoreBg)}>
          <ScoreRing pct={score} />

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className={cn('text-4xl font-bold', scoreText)}>
              {correct} / {total}
            </p>
            <p className="text-muted-foreground text-sm">correct answers</p>

            <div className="flex items-center justify-center sm:justify-start gap-4 pt-1 text-sm text-muted-foreground">
              <span>⏱ {timeTaken}</span>
              <span>·</span>
              <span>
                {score >= 80 ? '🎉 Excellent!' : score >= 60 ? '👍 Good job' : '📚 Keep practising'}
              </span>
            </div>
          </div>
        </div>

        {/* Review toggle */}
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setReviewOpen((v) => !v)}
          >
            {reviewOpen ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Answers
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Review Answers
              </>
            )}
          </Button>
        </div>

        {/* Answer review list */}
        {reviewOpen && (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <ReviewRow
                key={q.id}
                index={i}
                question={q}
                answer={answerMap.get(q.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky action buttons */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              navigate(`/setup/${session.testId}`, {
                state: { settings },
              })
            }
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Practice Again
          </Button>
        </div>
      </div>
    </div>
  )
}
