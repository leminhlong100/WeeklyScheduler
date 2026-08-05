import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { addDays, parseISODate, toISODate, weekdayMondayIndex } from '@/lib/utils/date'
import { taskSchema, type TaskFormInput } from '../schemas/taskSchema'
import { buildDurationOptions, buildStartTimeOptions } from '../utils/taskFormOptions'
import { cloneNotes } from '../utils/cloneNotes'
import { useCreateTask, useCreateTasksOnDays, useDeleteTask, useUpdateTask } from '../hooks/useTaskMutations'
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
  const createTasksOnDays = useCreateTasksOnDays(weekStartISO)
  const updateTask = useUpdateTask(weekStartISO)
  const deleteTask = useDeleteTask(weekStartISO)
  const [selectedDows, setSelectedDows] = useState<number[]>([])

  const isEdit = !!draft?.task
  const startOptions = buildStartTimeOptions()
  const durationOptions = buildDurationOptions(t)

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
      color: task?.color ?? null,
    })
    // Seeded here rather than during render because it has to land in the same
    // pass as the `form.reset()` above — the day picker and the form fields
    // describe one draft, and splitting them would show a half-swapped modal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDows(task ? [] : [weekdayMondayIndex(parseISODate(baseDate))])
    // Only re-run when the target task/slot changes — `categories` is
    // intentionally excluded so an in-progress edit isn't reset by
    // unrelated category list refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  if (!draft) return null

  const onSubmit = (values: TaskFormInput) => {
    const onError = () => toast.error(t.somethingWentWrong)

    if (isEdit && draft.task) {
      updateTask.mutate(
        {
          id: draft.task.id,
          patch: {
            title: values.title,
            category_id: values.categoryId,
            task_date: values.taskDate,
            start_minute: values.startMinute,
            duration_minute: values.durationMinute,
            color: values.color,
          },
        },
        { onSuccess: () => { toast.success(t.taskUpdated); onClose() }, onError },
      )
    } else {
      const targetDates =
        selectedDows.length > 0
          ? selectedDows.map((dow) => toISODate(addDays(parseISODate(weekStartISO), dow)))
          : [values.taskDate]

      if (targetDates.length > 1) {
        createTasksOnDays.mutate(
          {
            title: values.title,
            categoryId: values.categoryId,
            taskDates: targetDates,
            startMinute: values.startMinute,
            durationMinute: values.durationMinute,
            color: values.color,
          },
          { onSuccess: () => { toast.success(t.taskCreated); onClose() }, onError },
        )
      } else {
        createTask.mutate(
          {
            title: values.title,
            categoryId: values.categoryId,
            taskDate: targetDates[0],
            startMinute: values.startMinute,
            durationMinute: values.durationMinute,
            color: values.color,
          },
          { onSuccess: () => { toast.success(t.taskCreated); onClose() }, onError },
        )
      }
    }
  }

  const handleDelete = () => {
    if (!draft.task) return
    deleteTask.mutate(draft.task.id, {
      onSuccess: () => { toast.success(t.taskDeleted); onClose() },
      onError: () => toast.error(t.somethingWentWrong),
    })
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
    createTask.isPending || createTasksOnDays.isPending || updateTask.isPending || deleteTask.isPending

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
