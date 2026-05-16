import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  Check,
  FileText,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog'
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
import { useTestsStore } from '../store/testsStore'
import type { Question } from '../types'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

// ─── Question form types ────────────────────────────────────────────────────

interface QuestionDraft {
  text: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
}

const EMPTY_DRAFT: QuestionDraft = {
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
}

// ─── Sortable question row ──────────────────────────────────────────────────

interface SortableRowProps {
  question: Question
  index: number
  onEdit: () => void
  onDelete: () => void
}

function SortableRow({ question, index, onEdit, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const truncated =
    question.text.length > 60 ? question.text.slice(0, 60) + '…' : question.text

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-sm group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="w-7 shrink-0 text-muted-foreground font-mono text-xs">{index + 1}.</span>

      <span className="flex-1 min-w-0 truncate">{truncated}</span>

      <Badge variant="secondary" className="shrink-0 font-mono">
        {OPTION_LABELS[question.correctIndex]}
      </Badge>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit question">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label="Delete question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this question?</AlertDialogTitle>
              <AlertDialogDescription>
                "{truncated}" — this cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// ─── Question form panel ────────────────────────────────────────────────────

interface QuestionFormProps {
  draft: QuestionDraft
  isEditing: boolean
  saving: boolean
  onChange: (d: QuestionDraft) => void
  onSave: () => void
  onCancel: () => void
}

function QuestionForm({ draft, isEditing, saving, onChange, onSave, onCancel }: QuestionFormProps) {
  const valid = draft.text.trim() && draft.options.every((o) => o.trim())

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{isEditing ? 'Edit Question' : 'New Question'}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Question text */}
      <div className="space-y-1.5">
        <Label htmlFor="q-text">Question *</Label>
        <Textarea
          id="q-text"
          placeholder="Enter the question…"
          value={draft.text}
          onChange={(e) => onChange({ ...draft, text: e.target.value })}
          className="min-h-[80px] resize-none"
          autoFocus
        />
      </div>

      {/* Options */}
      <div className="space-y-1.5">
        <Label>Answer options *</Label>
        <RadioGroup
          value={String(draft.correctIndex)}
          onValueChange={(v) => onChange({ ...draft, correctIndex: Number(v) })}
          className="gap-2"
        >
          {OPTION_LABELS.map((letter, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem
                value={String(i)}
                id={`opt-${i}`}
                aria-label={`Option ${letter} is correct`}
              />
              <span className="w-5 shrink-0 text-xs font-mono text-muted-foreground font-semibold">
                {letter}
              </span>
              <Input
                placeholder={`Option ${letter}`}
                value={draft.options[i]}
                onChange={(e) => {
                  const opts = [...draft.options] as [string, string, string, string]
                  opts[i] = e.target.value
                  onChange({ ...draft, options: opts })
                }}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground pl-7">Select the radio button next to the correct answer.</p>
      </div>

      {/* Explanation */}
      <div className="space-y-1.5">
        <Label htmlFor="q-explanation">Explanation (optional)</Label>
        <Textarea
          id="q-explanation"
          placeholder="Why is this the correct answer?"
          value={draft.explanation}
          onChange={(e) => onChange({ ...draft, explanation: e.target.value })}
          className="min-h-[60px] resize-none text-sm"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!valid || saving}>
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Add Question'}
        </Button>
      </div>
    </div>
  )
}

// ─── Import preview dialog ──────────────────────────────────────────────────

interface ImportedQuestion {
  text: string
  options: string[]
  correctIndex: number
  explanation: string
  orderIndex: number
}

interface ImportDialogProps {
  parsed: ImportedQuestion[]
  total: number
  failed: number
  onConfirm: () => void
  onCancel: () => void
  importing: boolean
}

function ImportDialog({ parsed, total, failed, onConfirm, onCancel, importing }: ImportDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            Parsed {parsed.length} of {total} questions.{' '}
            {failed > 0 && (
              <span className="text-destructive">{failed} could not be parsed.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          {parsed.map((q, i) => (
            <div key={i} className="rounded-md border p-3 text-sm space-y-1.5">
              <p className="font-medium">
                {i + 1}. {q.text}
              </p>
              <ul className="space-y-0.5 pl-2">
                {q.options.map((opt, j) => (
                  <li
                    key={j}
                    className={`flex gap-2 ${j === q.correctIndex ? 'text-green-700 font-semibold' : 'text-muted-foreground'}`}
                  >
                    {j === q.correctIndex && <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                    {j !== q.correctIndex && <span className="w-3.5 shrink-0" />}
                    <span>
                      {OPTION_LABELS[j]}. {opt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={importing || parsed.length === 0}>
            {importing ? 'Importing…' : `Import ${parsed.length} questions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main TestEditor page ────────────────────────────────────────────────────

export default function TestEditor() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const { addTest, updateTest: updateStoreTest, fetch: refetchTests } = useTestsStore()

  const numericTestId = testId ? Number(testId) : null
  const isEdit = numericTestId !== null

  // Test metadata
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [savedTestId, setSavedTestId] = useState<number | null>(numericTestId)
  const [metaLoaded, setMetaLoaded] = useState(!isEdit)

  // Questions
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(isEdit)

  // Question form
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  // Import
  const [importParsed, setImportParsed] = useState<ImportedQuestion[] | null>(null)
  const [importTotal, setImportTotal] = useState(0)
  const [importFailed, setImportFailed] = useState(0)
  const [importing, setImporting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load test and questions in edit mode
  useEffect(() => {
    if (!isEdit || numericTestId === null) return
    ;(async () => {
      try {
        const [test, qs] = await Promise.all([
          window.api.getTests().then((ts) => ts.find((t) => t.id === numericTestId)),
          window.api.getQuestions(numericTestId),
        ])
        if (test) {
          setName(test.name)
          setDescription(test.description)
        }
        setQuestions(qs)
      } catch {
        toast.error('Failed to load test')
      } finally {
        setMetaLoaded(true)
        setQuestionsLoading(false)
      }
    })()
  }, [isEdit, numericTestId])

  // Ensure test exists before writing questions (create mode: create on blur)
  const ensureTest = useCallback(async (): Promise<number | null> => {
    if (savedTestId !== null) return savedTestId
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter a test name first')
      return null
    }
    try {
      const created = await window.api.createTest({ name: trimmed, description: description.trim() })
      setSavedTestId(created.id)
      addTest(created)
      navigate(`/editor/${created.id}`, { replace: true })
      return created.id
    } catch {
      toast.error('Failed to create test')
      return null
    }
  }, [savedTestId, name, description, addTest, navigate])

  // Auto-save name/description on blur
  async function handleMetaBlur() {
    if (!name.trim()) return
    if (savedTestId === null) {
      await ensureTest()
      return
    }
    try {
      const updated = await window.api.updateTest(savedTestId, {
        name: name.trim(),
        description: description.trim(),
      })
      updateStoreTest(updated)
    } catch {
      toast.error('Failed to save')
    }
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || savedTestId === null) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(questions, oldIndex, newIndex)
    setQuestions(reordered)
    try {
      await window.api.reorderQuestions(savedTestId, reordered.map((q) => q.id))
    } catch {
      toast.error('Failed to save order')
    }
  }

  // ── Add / edit question ──────────────────────────────────────────────────

  function openAddForm() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormOpen(true)
  }

  function openEditForm(q: Question) {
    setEditingId(q.id)
    setDraft({
      text: q.text,
      options: q.options as [string, string, string, string],
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? '',
    })
    setFormOpen(true)
  }

  async function handleSaveQuestion() {
    const tid = await ensureTest()
    if (tid === null) return
    setSaving(true)
    try {
      if (editingId !== null) {
        const updated = await window.api.updateQuestion(editingId, {
          text: draft.text.trim(),
          options: draft.options.map((o) => o.trim()),
          correctIndex: draft.correctIndex,
          explanation: draft.explanation.trim(),
        })
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? updated : q)))
        toast.success('Question updated')
      } else {
        const created = await window.api.createQuestion({
          testId: tid,
          text: draft.text.trim(),
          options: draft.options.map((o) => o.trim()),
          correctIndex: draft.correctIndex,
          explanation: draft.explanation.trim(),
          orderIndex: questions.length,
        })
        setQuestions((prev) => [...prev, created])
        toast.success('Question added')
      }
      setFormOpen(false)
      setDraft(EMPTY_DRAFT)
      await refetchTests()
    } catch {
      toast.error('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteQuestion(id: number) {
    try {
      await window.api.deleteQuestion(id)
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      toast.success('Question deleted')
      await refetchTests()
    } catch {
      toast.error('Failed to delete question')
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────

  async function handleImportClick() {
    const tid = await ensureTest()
    if (tid === null) return

    const filePath = await window.api.openFilePicker()
    if (!filePath) return

    try {
      const parsed = await window.api.importQuestions(tid, filePath)
      if (parsed.length === 0) {
        toast.error(
          'No questions could be parsed. Make sure questions are numbered and each has 4 options on separate lines.'
        )
        return
      }
      // We don't know how many lines were "attempted" vs skipped, so count total and parsed
      setImportParsed(parsed as ImportedQuestion[])
      setImportTotal(parsed.length) // will be updated if we add a count return
      setImportFailed(0)
    } catch {
      toast.error('Failed to parse file')
    }
  }

  async function handleImportConfirm() {
    if (!importParsed || savedTestId === null) return
    setImporting(true)
    try {
      const created = await window.api.bulkCreateQuestions(savedTestId, importParsed)
      setQuestions((prev) => [...prev, ...created])
      toast.success(`Imported ${created.length} questions`)
      setImportParsed(null)
      await refetchTests()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const pageTitle = isEdit ? (name || 'Edit Test') : 'New Test'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {isEdit ? 'Edit test and questions' : 'Create a new test'}
          </p>
        </div>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto space-y-8">
        {/* ── Metadata section ── */}
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="test-name">Test name *</Label>
            <Input
              id="test-name"
              placeholder="e.g. History — State Exam 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleMetaBlur}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="test-desc">Description (optional)</Label>
            <Textarea
              id="test-desc"
              placeholder="What is this test for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleMetaBlur}
              className="resize-none"
              rows={2}
            />
          </div>
        </section>

        {/* ── Questions section ── */}
        {metaLoaded && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Questions</h2>
                <p className="text-xs text-muted-foreground">
                  {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportClick}
                  title="Import from .docx or .txt file"
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Import
                </Button>
                <Button size="sm" onClick={openAddForm} disabled={formOpen}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Question
                </Button>
              </div>
            </div>

            {/* Question form */}
            {formOpen && (
              <QuestionForm
                draft={draft}
                isEditing={editingId !== null}
                saving={saving}
                onChange={setDraft}
                onSave={handleSaveQuestion}
                onCancel={() => { setFormOpen(false); setDraft(EMPTY_DRAFT) }}
              />
            )}

            {/* Question list */}
            {questionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-11 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : questions.length === 0 && !formOpen ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed text-center gap-3">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">No questions yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click "Add Question" or import from a file.
                  </p>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {questions.map((q, i) => (
                      <SortableRow
                        key={q.id}
                        question={q}
                        index={i}
                        onEdit={() => openEditForm(q)}
                        onDelete={() => handleDeleteQuestion(q.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        )}
      </main>

      {/* Import preview dialog */}
      {importParsed && (
        <ImportDialog
          parsed={importParsed}
          total={importTotal}
          failed={importFailed}
          importing={importing}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportParsed(null)}
        />
      )}
    </div>
  )
}
