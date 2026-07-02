import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { translateFieldError } from '@/lib/utils/formErrors'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { addDays, parseISODate, toISODate, weekdayMondayIndex } from '@/lib/utils/date'
import { taskSchema, type TaskFormInput } from '../schemas/taskSchema'
import { buildDurationOptions, buildStartTimeOptions } from '../utils/taskFormOptions'
import { useCreateTask, useCreateTasksOnDays, useDeleteTask, useUpdateTask } from '../hooks/useTaskMutations'
import type { Task } from '../api/tasksApi'
import { TaskCategoryChips } from './TaskCategoryChips'
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
    })
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
        className="max-w-[440px] overflow-hidden rounded-[26px] border-[1.5px] p-0"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-6 py-5"
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
            <Input id="title" placeholder={t.titlePh} {...form.register('title')} />
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

          {isEdit ? (
            <FormField label={t.date} htmlFor="taskDate">
              <Input id="taskDate" type="date" {...form.register('taskDate')} />
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

          <div className="mt-1 flex items-center gap-3">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isPending}
                style={{ borderColor: theme.dangerBorder, color: theme.danger }}
              >
                {t.delete}
              </Button>
            )}
            {isEdit && (
              <Button type="button" variant="outline" onClick={handleDuplicate} disabled={isPending}>
                {t.duplicate}
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose}>
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
