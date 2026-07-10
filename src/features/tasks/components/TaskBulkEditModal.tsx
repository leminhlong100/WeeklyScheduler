import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/common/GradientButton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useCategories } from '@/features/categories/hooks/useCategories'
import type { TaskUpdate } from '../api/tasksApi'
import { buildDurationOptions, buildStartTimeOptions } from '../utils/taskFormOptions'
import { TaskCategoryChips } from './TaskCategoryChips'

interface TaskBulkEditModalProps {
  count: number
  onClose: () => void
  onApply: (patch: TaskUpdate) => void
  isPending: boolean
}

/** A field row that stays disabled (and excluded from the patch) until its toggle is turned on. */
function FieldToggle({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: (next: boolean) => void
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <span
          className="flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-150"
          style={{ background: enabled ? theme.accent : theme.border }}
        >
          <span
            className="h-4 w-4 rounded-full bg-white transition-transform duration-150"
            style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </span>
        <span className="text-xs font-extrabold" style={{ color: enabled ? theme.text : theme.muted }}>
          {label}
        </span>
      </button>
      {enabled && <div className="mt-2">{children}</div>}
    </div>
  )
}

/**
 * Mounted only while open (the parent renders it conditionally), so field state
 * starts fresh on every open via useState initializers — no reset effect needed.
 */
export function TaskBulkEditModal({ count, onClose, onApply, isPending }: TaskBulkEditModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useCategories()
  const startOptions = buildStartTimeOptions()
  const durationOptions = buildDurationOptions(t)

  const [titleOn, setTitleOn] = useState(false)
  const [categoryOn, setCategoryOn] = useState(false)
  const [startOn, setStartOn] = useState(false)
  const [durationOn, setDurationOn] = useState(false)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null)
  const [startMinute, setStartMinute] = useState(startOptions[0].value)
  const [durationMinute, setDurationMinute] = useState(60)

  const trimmedTitle = title.trim()
  const titleValid = !titleOn || trimmedTitle.length > 0
  const nothingSelected = !titleOn && !categoryOn && !startOn && !durationOn
  const canApply = !nothingSelected && titleValid && !isPending

  const handleApply = () => {
    if (!canApply) return
    const patch: TaskUpdate = {}
    if (titleOn) patch.title = trimmedTitle
    if (categoryOn) patch.category_id = categoryId
    if (startOn) patch.start_minute = startMinute
    if (durationOn) patch.duration_minute = durationMinute
    onApply(patch)
  }

  const selectTriggerStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }
  const selectContentStyle = { background: theme.modalBg, borderColor: theme.border, color: theme.text }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="h-2" style={{ background: theme.brandGrad }} />
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <div>
            <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
              {t.bulkEditTitle.replace('{n}', String(count))}
            </DialogTitle>
            <p className="mt-1 text-[12.5px] font-medium" style={{ color: theme.muted }}>
              {t.bulkEditHint}
            </p>
          </div>

          <FieldToggle label={t.titlePh} enabled={titleOn} onToggle={setTitleOn}>
            <Input
              placeholder={t.titlePh}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
            />
          </FieldToggle>

          <FieldToggle label={t.category} enabled={categoryOn} onToggle={setCategoryOn}>
            <TaskCategoryChips
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
              theme={theme}
            />
          </FieldToggle>

          <FieldToggle label={t.start} enabled={startOn} onToggle={setStartOn}>
            <Select
              items={startOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              value={String(startMinute)}
              onValueChange={(v) => setStartMinute(Number(v))}
            >
              <SelectTrigger className="w-full" style={selectTriggerStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {startOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldToggle>

          <FieldToggle label={t.duration} enabled={durationOn} onToggle={setDurationOn}>
            <Select
              items={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              value={String(durationMinute)}
              onValueChange={(v) => setDurationMinute(Number(v))}
            >
              <SelectTrigger className="w-full" style={selectTriggerStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {durationOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldToggle>

          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
            >
              {t.cancel}
            </Button>
            <GradientButton type="button" onClick={handleApply} disabled={!canApply}>
              {t.save}
            </GradientButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
