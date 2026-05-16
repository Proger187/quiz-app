import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, BookOpen, Pencil, Play, Trash2, ClipboardList } from 'lucide-react'
import { useTestsStore } from '../store/testsStore'
import { Button } from '../components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog'
import type { Test } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
      <div className="rounded-full bg-muted p-6">
        <ClipboardList className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">No tests yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Create your first test to start practising. Add questions, set up answer keys, and run
          practice sessions.
        </p>
      </div>
      <Button onClick={onNew} size="lg">
        <Plus className="w-5 h-5 mr-2" />
        Create your first test
      </Button>
    </div>
  )
}

function TestCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-3/4 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-4 w-1/3 rounded bg-muted" />
      </CardContent>
      <CardFooter>
        <div className="h-9 w-20 rounded bg-muted mr-2" />
        <div className="h-9 w-20 rounded bg-muted" />
      </CardFooter>
    </Card>
  )
}

interface TestCardProps {
  test: Test
  onEdit: (id: number) => void
  onPractice: (id: number) => void
  onDelete: (id: number) => void
}

function TestCard({ test, onEdit, onPractice, onDelete }: TestCardProps) {
  const [sessionHistory, setSessionHistory] = useState<{ score: number }[]>([])

  useEffect(() => {
    window.api.getSessionHistory(test.id).then((sessions) => {
      setSessionHistory(
        sessions.map((s) => ({ score: s.score ?? 0 }))
      )
    })
  }, [test.id])

  const scoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{test.name}</CardTitle>
            {test.description && (
              <CardDescription className="mt-1 line-clamp-2">{test.description}</CardDescription>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${test.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{test.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the test and all its questions. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(test.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {test.questionCount} {test.questionCount === 1 ? 'question' : 'questions'}
          </span>
          <span>Updated {formatDate(test.updatedAt)}</span>
        </div>

        {sessionHistory.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recent scores:</span>
            {sessionHistory.map((s, i) => (
              <span
                key={i}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColor(s.score)}`}
              >
                {s.score}%
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(test.id)}
          className="flex-1"
        >
          <Pencil className="w-4 h-4 mr-1.5" />
          Edit
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1">
              <Button
                size="sm"
                onClick={() => onPractice(test.id)}
                disabled={test.questionCount === 0}
                className="w-full"
                aria-label={test.questionCount === 0 ? 'Add questions first to practice' : `Practice ${test.name}`}
              >
                <Play className="w-4 h-4 mr-1.5" />
                Practice
              </Button>
            </span>
          </TooltipTrigger>
          {test.questionCount === 0 && (
            <TooltipContent>Add questions first</TooltipContent>
          )}
        </Tooltip>
      </CardFooter>
    </Card>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { tests, loading, fetch, removeTest } = useTestsStore()

  useEffect(() => {
    fetch()
  }, [fetch])

  async function handleDelete(id: number) {
    const test = tests.find((t) => t.id === id)
    try {
      await window.api.deleteTest(id)
      removeTest(id)
      toast.success(`"${test?.name}" deleted`)
    } catch {
      toast.error('Failed to delete test')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quiz Practice</h1>
          <p className="text-sm text-muted-foreground">Your test library</p>
        </div>
        <Button onClick={() => navigate('/editor')}>
          <Plus className="w-4 h-4 mr-2" />
          New Test
        </Button>
      </header>

      {/* Body */}
      <main className="px-6 py-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TestCardSkeleton />
            <TestCardSkeleton />
          </div>
        ) : tests.length === 0 ? (
          <EmptyState onNew={() => navigate('/editor')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tests.map((test: Test) => (
              <TestCard
                key={test.id}
                test={test}
                onEdit={(id) => navigate(`/editor/${id}`)}
                onPractice={(id) => navigate(`/setup/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
