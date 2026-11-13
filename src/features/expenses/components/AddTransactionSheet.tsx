import { useState } from 'react'
import { KeyboardIcon, SparklesIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { toDraftRows, type DraftRow, type ExpenseDraft } from '../utils/draft'
import { ExpenseEditForm } from './ExpenseEditForm'
import { ParsedDraftList } from './ParsedDraftList'
import { QuickAddSheet } from './QuickAddSheet'
import { SheetDialog } from './SheetDialog'
import { firstAmountIn } from '@/lib/utils/parseMoneyInput'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'

type AddMode = 'ai' | 'manual'
const MODE_KEY = 'weeklyScheduler.expenseAddMode'

function readMode(): AddMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'manual' ? 'manual' : 'ai'
  } catch {
    return 'ai'
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ngày điền sẵn cho nhập tay (ngày 1 của tháng đang xem nếu không phải tháng này). */
  defaultDate: string
  draft: ExpenseDraft | null
  onDraftChange: (draft: ExpenseDraft | null) => void
}

/**
 * Một chỗ duy nhất để thêm giao dịch, mở từ nút ＋. Hai cách nhập chuyển qua
 * lại bằng một công tắc: gõ/nói cho AI tách, hoặc nhập tay. Nhớ cách dùng lần
 * trước. Có bản nháp AI đang dở thì mở thẳng vào bản nháp.
 */
export function AddTransactionSheet({
  open,
  onOpenChange,
  defaultDate,
  draft,
  onDraftChange,
}: Props) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [mode, setModeState] = useState<AddMode>(readMode)
  /** Câu gốc trả lại ô nhập khi bỏ bản nháp — để sửa câu, không phải gõ lại. */
  const [restoreText, setRestoreText] = useState('')
  /** Điền sẵn cho nhập tay khi chuyển từ AI (AI lỗi / không đọc được câu). */
  const [prefill, setPrefill] = useState<{ amount?: string; note?: string }>({})

  const setMode = (next: AddMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(MODE_KEY, next)
    } catch {
      // Không lưu được thì lần sau về mặc định.
    }
  }

  const effectiveMode: AddMode = draft ? 'ai' : mode

  return (
    <SheetDialog open={open} onOpenChange={onOpenChange} title={t.addTransaction}>
      <div
        role="radiogroup"
        aria-label={t.addTransaction}
        className="flex gap-1 rounded-[14px] border-[1.5px] p-1"
        style={{ borderColor: theme.border, background: theme.chip }}
      >
        {(
          [
            ['ai', t.quickAddLabel, SparklesIcon],
            ['manual', t.enterManually, KeyboardIcon],
          ] as const
        ).map(([key, label, Icon]) => {
          const selected = effectiveMode === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(key)}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] font-extrabold sm:min-h-9"
              style={{
                background: selected ? theme.accent : 'transparent',
                color: selected ? '#fff' : theme.mutedText,
              }}
            >
              <Icon className="size-4" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>

      {effectiveMode === 'ai' ? (
        draft ? (
          <ParsedDraftList
            draft={draft}
            onChange={(rows: DraftRow[]) => onDraftChange({ ...draft, rows })}
            onDone={() => {
              setRestoreText(draft.rawText)
              // Ở lại chế độ AI để sửa câu, kể cả khi lần trước dùng nhập tay.
              setMode('ai')
              onDraftChange(null)
            }}
            onSaved={() => {
              setRestoreText('')
              onDraftChange(null)
              onOpenChange(false)
            }}
          />
        ) : (
          <QuickAddSheet
            // Đổi key khi có câu cần trả lại: ô nhập dựng lại với câu đó.
            key={restoreText}
            initialText={restoreText}
            onDrafts={(items, rawText) => onDraftChange({ rawText, rows: toDraftRows(items) })}
            onEnterManually={(text) => {
              setPrefill({
                amount: firstAmountIn(text, DEFAULT_CURRENCY) ?? undefined,
                note: text || undefined,
              })
              setMode('manual')
            }}
          />
        )
      ) : (
        <ExpenseEditForm
          key={`${prefill.amount ?? ''}|${prefill.note ?? ''}`}
          defaultDate={defaultDate}
          defaultAmount={prefill.amount}
          defaultNote={prefill.note}
          onDone={() => {
            setPrefill({})
            onOpenChange(false)
          }}
        />
      )}
    </SheetDialog>
  )
}
