import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Play } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Card, CardContent } from '../components/ui/card'
import type { SessionSettings, Test } from '../types'

const DEFAULT_SETTINGS: Omit<SessionSettings, 'questionCount'> = {
  shuffle: true,
  shuffleOptions: false,
  immediatelyFeedback: true,
  showExplanation: false,
  showProgressBar: true,
}

interface SettingRowProps {
  id: string
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (v: boolean) => void
}

function SettingRow({ id, label, description, checked, disabled, onCheckedChange }: SettingRowProps) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}

export default function PracticeSetup() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { settings?: SessionSettings } | null)?.settings

  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const [settings, setSettings] = useState<SessionSettings>({
    ...(prefill ?? DEFAULT_SETTINGS),
    questionCount: prefill?.questionCount ?? 0,
  })

  useEffect(() => {
    if (!testId) return
    window.api.getTests().then((tests) => {
      const found = tests.find((t) => t.id === Number(testId))
      if (found) {
        setTest(found)
        // If coming from "Practice Again", respect the prefilled count (clamped to available)
        setSettings((s) => ({
          ...s,
          questionCount: Math.min(s.questionCount || found.questionCount, found.questionCount),
        }))
      }
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load test')
      setLoading(false)
    })
  }, [testId])

  function set<K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  async function handleStart() {
    if (!test) return
    setStarting(true)
    try {
      const session = await window.api.startSession(test.id, settings)
      navigate(`/session/${session.id}`)
    } catch {
      toast.error('Failed to start session')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Test not found.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    )
  }

  const maxQuestions = test.questionCount
  const countValid = settings.questionCount >= 1 && settings.questionCount <= maxQuestions

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{test.name}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {maxQuestions} {maxQuestions === 1 ? 'question' : 'questions'} available
          </p>
        </div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Session settings</h2>
          <p className="text-sm text-muted-foreground">Configure how you want to practise.</p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-2 px-5">
            {/* Number of questions */}
            <div className="py-3 space-y-2">
              <Label htmlFor="q-count" className="text-sm font-medium">
                Number of questions
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="q-count"
                  type="number"
                  min={1}
                  max={maxQuestions}
                  value={settings.questionCount}
                  onChange={(e) => {
                    const v = Math.min(Math.max(1, Number(e.target.value)), maxQuestions)
                    set('questionCount', v)
                  }}
                  className="w-24"
                  aria-label="Number of questions"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => set('questionCount', maxQuestions)}
                  disabled={settings.questionCount === maxQuestions}
                >
                  All ({maxQuestions})
                </Button>
                {!countValid && (
                  <span className="text-xs text-destructive">
                    Must be 1–{maxQuestions}
                  </span>
                )}
              </div>
            </div>

            <div className="border-t" />

            <SettingRow
              id="shuffle"
              label="Shuffle questions"
              description="Present questions in a random order each session."
              checked={settings.shuffle}
              onCheckedChange={(v) => set('shuffle', v)}
            />
            <div className="border-t" />

            <SettingRow
              id="shuffleOptions"
              label="Shuffle answer options"
              description="Randomise the order of A/B/C/D each time."
              checked={settings.shuffleOptions}
              onCheckedChange={(v) => set('shuffleOptions', v)}
            />
            <div className="border-t" />

            <SettingRow
              id="immediatelyFeedback"
              label="Immediate feedback"
              description="Show correct/wrong after each answer before moving on."
              checked={settings.immediatelyFeedback}
              onCheckedChange={(v) => {
                set('immediatelyFeedback', v)
                if (!v) set('showExplanation', false)
              }}
            />
            <div className="border-t" />

            <SettingRow
              id="showExplanation"
              label="Show explanation"
              description="Display the answer explanation after each question (requires Immediate feedback)."
              checked={settings.showExplanation}
              disabled={!settings.immediatelyFeedback}
              onCheckedChange={(v) => set('showExplanation', v)}
            />
            <div className="border-t" />

            <SettingRow
              id="showProgressBar"
              label="Show progress bar"
              description="Display a progress bar at the top of the session."
              checked={settings.showProgressBar}
              onCheckedChange={(v) => set('showProgressBar', v)}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleStart}
          disabled={starting || !countValid}
        >
          <Play className="w-5 h-5 mr-2" />
          {starting ? 'Starting…' : 'Start Practice'}
        </Button>
      </main>
    </div>
  )
}
