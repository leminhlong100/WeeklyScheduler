import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { RepeatIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/common/GradientButton'
import { FormField } from '@/components/form/FormField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import type { DerivedTheme } from '@/features/theme/types'
import { translateFieldError } from '@/lib/utils/formErrors'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { parseISODate, weekdayMondayIndex } from '@/lib/utils/date'
import { taskSchema, type TaskFormInput } from '../schemas/taskSchema'
import { buildDurationOptions, buildStartTimeOptions } from '../utils/taskFormOptions'
import { buildRepeatOptions } from '../utils/repeatOptions'
import { buildRepeatDates } from '../utils/buildRepeatDates'
import { cloneNotes } from '../utils/cloneNotes'
import {
  useCreateTask,
  useCreateTaskOccurrences,
  useDeleteTask,
  useDeleteTaskSeries,
  useUpdateTask,
  useUpdateTaskSeries,
} from '../hooks/useTaskMutations'
import type { Task } from '../api/tasksApi'
import { UNCATEGORIZED_COLOR } from '../types'
import { TaskCategoryChips } from './TaskCategoryChips'
import { TaskColorField } from './TaskColorField'
import { DayOfWeekPicker } from './DayOfWeekPicker'

export interface TaskDraft {
  task?: Task
  taskDate: string
  startMinute: number
}

interface TaskFormModalProps {
  draft: TaskDraft | null
  weekStartISO: string
  onClose: () => void
}

export function TaskFormModal({ draft, weekStartISO, onClose }: TaskFormModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useCategories()
  const createTask = useCreateTask(weekStartISO)
  const createOccurrences = useCreateTaskOccurrences(weekStartISO)
  const updateTask = useUpdateTask(weekStartISO)
  const deleteTask = useDeleteTask(weekStartISO)
  const updateSeries = useUpdateTaskSeries()
  const deleteSeries = useDeleteTaskSeries()
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const [applyToSeries, setApplyToSeries] = useState(false)

  const isEdit = !!draft?.task
  const seriesId = draft?.task?.series_id ?? null
  const startOptions = buildStartTimeOptions()
  const durationOptions = buildDurationOptions(t)
  const repeatOptions = buildRepeatOptions(t)

  const toggleDow = (dow: number) => {
    setSelectedDows((prev) => {
      if (prev.includes(dow)) {
        return prev.length === 1 ? prev : prev.filter((d) => d !== dow)
      }
      return [...prev, dow].sort((a, b) => a - b)
    })
  }

  const form = useForm<TaskFormInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      categoryId: null,
      taskDate: draft?.taskDate ?? '',
      startMinute: draft?.startMinute ?? startOptions[0].value,
      durationMinute: 60,
      repeatWeeks: 1,
      color: null,
    },
  })

  useEffect(() => {
    if (!draft) return
    const task = draft.task
    const baseDate = task?.task_date ?? draft.taskDate
    form.reset({
      title: task?.title ?? '',
      categoryId: task?.category_id ?? categories[0]?.id ?? null,
      taskDate: baseDate,
      startMinute: task?.start_minute ?? draft.startMinute,
      durationMinute: task?.duration_minute ?? 60,
      repeatWeeks: 1,
      color: task?.color ?? null,
    })
    // Seeded here rather than during render because it has to land in the same
    // pass as the `form.reset()` above — the day picker and the form fields
    // describe one draft, and splitting them would show a half-swapped modal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDows(task ? [] : [weekdayMondayIndex(parseISODate(baseDate))])
    setApplyToSeries(false)
    // Only re-run when the target task/slot changes — `categories` is
    // intentionally excluded so an in-progress edit isn't reset by
    // unrelated category list refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  if (!draft) return null

  const onSubmit = (values: TaskFormInput) => {
    const onError = () => toast.error(t.somethingWentWrong)

    if (isEdit && draft.task) {
      const task = draft.task
      const sharedPatch = {
        title: values.title,
        category_id: values.categoryId,
        start_minute: values.startMinute,
        duration_minute: values.durationMinute,
        color: values.color,
      }

      if (applyToSeries && task.series_id) {
        // The series patch already covers this occurrence (it starts at this
        // date), so only a date move needs a second, single-task write —
        // every occurrence sits on its own date and must keep it.
        updateSeries.mutate(
          { seriesId: task.series_id, fromDate: task.task_date, patch: sharedPatch },
          {
            onSuccess: () => {
              if (values.taskDate !== task.task_date) {
                updateTask.mutate({ id: task.id, patch: { task_date: values.taskDate } })
              }
              toast.success(t.seriesUpdated)
              onClose()
            },
            onError,
          },
        )
        return
      }

      updateTask.mutate(
        { id: task.id, patch: { ...sharedPatch, task_date: values.taskDate } },
        { onSuccess: () => { toast.success(t.taskUpdated); onClose() }, onError },
      )
    } else {
      const dows =
        selectedDows.length > 0
          ? selectedDows
          : [weekdayMondayIndex(parseISODate(values.taskDate))]
      const targetDates = buildRepeatDates(weekStartISO, dows, values.repeatWeeks)
      // Only a run that spans several weeks becomes a series — picking a few
      // weekdays of one week stays a handful of independent tasks, as before.
      const newSeriesId = values.repeatWeeks > 1 ? crypto.randomUUID() : null

      createOccurrences.mutate(
        {
          title: values.title,
          categoryId: values.categoryId,
          taskDates: targetDates,
          startMinute: values.startMinute,
          durationMinute: values.durationMinute,
          seriesId: newSeriesId,
          color: values.color,
        },
        {
          onSuccess: () => {
            toast.success(
              targetDates.length > 1
                ? t.seriesCreated.replace('{n}', String(targetDates.length))
                : t.taskCreated,
            )
            onClose()
          },
          onError,
        },
      )
    }
  }

  const handleDelete = () => {
    if (!draft.task) return
    deleteTask.mutate(draft.task.id, {
      onSuccess: () => { toast.success(t.taskDeleted); onClose() },
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  const handleDeleteSeries = () => {
    const task = draft.task
    if (!task?.series_id) return
    if (!window.confirm(t.deleteSeriesConfirm)) return
    deleteSeries.mutate(
      { seriesId: task.series_id, fromDate: task.task_date },
      {
        onSuccess: () => { toast.success(t.seriesDeleted); onClose() },
        onError: () => toast.error(t.somethingWentWrong),
      },
    )
  }

  const handleDuplicate = () => {
    if (!draft.task) return
    const task = draft.task
    createTask.mutate(
      {
        title: task.title,
        categoryId: task.category_id,
        taskDate: task.task_date,
        startMinute: task.start_minute,
        durationMinute: task.duration_minute,
        color: task.color,
        notes: cloneNotes(task.notes),
      },
      {
        onSuccess: () => { toast.success(t.taskDuplicated); onClose() },
        onError: () => toast.error(t.somethingWentWrong),
      },
    )
  }

  const isPending =
    createTask.isPending ||
    createOccurrences.isPending ||
    updateTask.isPending ||
    deleteTask.isPending ||
    updateSeries.isPending ||
    deleteSeries.isPending

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5"
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
              {isEdit ? t.editEvent : t.addEvent}
            </DialogTitle>
          </div>

          <FormField
            label={t.titlePh}
            htmlFor="title"
            error={translateFieldError(t, form.formState.errors.title?.message)}
          >
            <Input
              id="title"
              placeholder={t.titlePh}
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
              {...form.register('title')}
            />
          </FormField>

          <div>
            <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
              {t.category}
            </div>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <TaskCategoryChips
                  categories={categories}
                  selectedId={field.value}
                  onSelect={field.onChange}
                  theme={theme}
                />
              )}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
              {t.taskColor}
            </div>
            <TaskColorRow control={form.control} categories={categories} theme={theme} />
          </div>

          {isEdit ? (
            <FormField label={t.date} htmlFor="taskDate">
              <Input
                id="taskDate"
                type="date"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                {...form.register('taskDate')}
              />
            </FormField>
          ) : (
            <div>
              <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
                {t.repeatOnDays}
              </div>
              <DayOfWeekPicker labels={t.dow} selected={selectedDows} onToggle={toggleDow} theme={theme} />
            </div>
          )}

          {!isEdit && (
            <div>
              <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
                {t.repeatWeekly}
              </div>
              <Controller
                control={form.control}
                name="repeatWeeks"
                render={({ field }) => (
                  <Select
                    items={repeatOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}>
                      {repeatOptions.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {isEdit && seriesId && (
            <div className="rounded-2xl px-3.5 py-3" style={{ background: theme.chip }}>
              <div className="flex items-start gap-2">
                <RepeatIcon className="mt-px size-4 flex-shrink-0" style={{ color: theme.muted }} />
                <p className="text-[12.5px] font-semibold" style={{ color: theme.muted }}>
                  {t.seriesNotice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyToSeries((v) => !v)}
                className="mt-2.5 flex w-full items-center gap-2.5 text-left"
              >
                <span
                  className="flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-150"
                  style={{ background: applyToSeries ? theme.accent : theme.border }}
                >
                  <span
                    className="h-4 w-4 rounded-full bg-white transition-transform duration-150"
                    style={{ transform: applyToSeries ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </span>
                <span
                  className="text-xs font-extrabold"
                  style={{ color: applyToSeries ? theme.text : theme.muted }}
                >
                  {t.applyToSeries}
                </span>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
                {t.start}
              </div>
              <Controller
                control={form.control}
                name="startMinute"
                render={({ field }) => (
                  <Select
                    items={startOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}>
                      {startOptions.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex-1">
              <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
                {t.duration}
              </div>
              <Controller
                control={form.control}
                name="durationMinute"
                render={({ field }) => (
                  <Select
                    items={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}>
                      {durationOptions.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isPending}
                style={{ background: 'transparent', borderColor: theme.dangerBorder, color: theme.danger }}
              >
                {t.delete}
              </Button>
            )}
            {isEdit && seriesId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteSeries}
                disabled={isPending}
                style={{ background: 'transparent', borderColor: theme.dangerBorder, color: theme.danger }}
              >
                {t.deleteSeries}
              </Button>
            )}
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDuplicate}
                disabled={isPending}
                style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
              >
                {t.duplicate}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
            >
              {t.cancel}
            </Button>
            <GradientButton type="submit" disabled={isPending}>
              {t.save}
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The colour row, split out only so the "follow the category" swatch can
 * subscribe to the category chips above it — `useWatch` is a hook, and the
 * modal returns early when there is no draft.
 */
function TaskColorRow({
  control,
  categories,
  theme,
}: {
  control: Control<TaskFormInput>
  categories: { id: string; color: string }[]
  theme: DerivedTheme
}) {
  const categoryId = useWatch({ control, name: 'categoryId' })
  const categoryColor =
    categories.find((category) => category.id === categoryId)?.color ?? UNCATEGORIZED_COLOR

  return (
    <Controller
      control={control}
      name="color"
      render={({ field }) => (
        <TaskColorField
          value={field.value}
          onChange={field.onChange}
          categoryColor={categoryColor}
          theme={theme}
        />
      )}
    />
  )
}
