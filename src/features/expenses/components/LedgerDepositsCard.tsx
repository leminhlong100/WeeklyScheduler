import { useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useAuth } from '@/features/auth/AuthContext'
import { describeError } from '@/lib/utils/errorMessage'
import { formatMoney } from '@/lib/utils/formatMoney'
import type { LedgerDepositStatus } from '@/lib/supabase/database.types'
import type { LedgerDeposit } from '../api/ledgerDepositsApi'
import type { LedgerSummary } from '../api/ledgersApi'
import {
  useCancelLedgerDeposit,
  useDecideLedgerDeposit,
  useLedgerDeposits,
} from '../hooks/useLedgerDeposits'
import { MaskedAmount } from './MaskedAmount'
import { DepositDialog } from './DepositDialog'

/** Yêu cầu đã xong (nhận/từ chối/rút) chỉ hiện vài dòng gần nhất — lịch sử thật nằm trong sổ. */
const RECENT_DONE = 3

/**
 * Các yêu cầu nạp tiền (migration 0017).
 *
 * - `owner`: chủ sổ đang mở sổ của mình → duyệt "Đã nhận" / "Từ chối". Ẩn hẳn
 *   khi chưa ai từng nạp, để sổ không có thêm một thẻ rỗng.
 * - `sender`: người xem → nút "Nạp tiền" + các yêu cầu mình đã gửi (rút lại khi
 *   còn chờ). `ledgerId = null` ở sổ cá nhân: gom mọi sổ mình được mời xem.
 */
export function LedgerDepositsCard({
  mode,
  ledgerId,
  targetLedgers,
}: {
  mode: 'owner' | 'sender'
  ledgerId: string | null
  /** Chỉ dùng ở `sender`: các sổ được nạp vào. */
  targetLedgers?: LedgerSummary[]
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { user } = useAuth()
  const [depositOpen, setDepositOpen] = useState(false)
  const { data: deposits = [] } = useLedgerDeposits(ledgerId)

  // Ở sổ cá nhân hàm trả cả yêu cầu gửi VÀO sổ của mình; thẻ người gửi chỉ lấy
  // yêu cầu do chính mình gửi.
  const rows = mode === 'sender' ? deposits.filter((d) => d.from_user_id === user?.id) : deposits
  const pending = rows.filter((d) => d.status === 'pending')
  const done = rows.filter((d) => d.status !== 'pending').slice(0, RECENT_DONE)

  if (mode === 'owner' && rows.length === 0) return null

  return (
    <section
      className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] px-4 py-3.5"
      style={{
        borderColor: mode === 'owner' && pending.length > 0 ? theme.accent : theme.border,
        background: theme.chip,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-extrabold" style={{ color: theme.mutedText }}>
          {mode === 'sender'
            ? t.depositsMineTitle
            : pending.length > 0
              ? t.depositsPendingTitle
              : t.depositsReceivedTitle}
        </h2>
        {mode === 'sender' && (
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="flex min-h-9 items-center rounded-[12px] px-3 text-[13px] font-extrabold"
            style={{ background: theme.accentFill, color: theme.onAccent }}
          >
            + {t.depositButton}
          </button>
        )}
      </div>

      {[...pending, ...done].map((d) => (
        <DepositRow key={d.id} deposit={d} mode={mode} showLedger={ledgerId === null} />
      ))}

      {mode === 'sender' && (
        <DepositDialog
          open={depositOpen}
          onOpenChange={setDepositOpen}
          ledgers={
            ledgerId
              ? (targetLedgers ?? []).filter((l) => l.id === ledgerId)
              : (targetLedgers ?? [])
          }
        />
      )}
    </section>
  )
}

function DepositRow({
  deposit: d,
  mode,
  showLedger,
}: {
  deposit: LedgerDeposit
  mode: 'owner' | 'sender'
  showLedger: boolean
}) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const confirm = useConfirm()
  const decide = useDecideLedgerDeposit()
  const cancel = useCancelLedgerDeposit()
  const busy = decide.isPending || cancel.isPending
  const isPending = d.status === 'pending'

  const approve = async () => {
    const who = t.depositIncomeNote.replace('{name}', d.from_name)
    try {
      await decide.mutateAsync({
        id: d.id,
        approve: true,
        incomeNote: d.note ? `${who}: ${d.note}` : who,
      })
      toast.success(t.depositApproved)
    } catch (err) {
      toast.error(describeError(t, err))
    }
  }

  const reject = async () => {
    if (!(await confirm({ message: t.depositRejectConfirm, confirmLabel: t.depositReject }))) return
    try {
      await decide.mutateAsync({ id: d.id, approve: false, incomeNote: '' })
      toast.success(t.depositRejected)
    } catch (err) {
      toast.error(describeError(t, err))
    }
  }

  const withdraw = async () => {
    if (!(await confirm({ message: t.depositCancelConfirm, confirmLabel: t.depositCancel }))) return
    try {
      await cancel.mutateAsync(d.id)
      toast.success(t.depositCancelled)
    } catch (err) {
      toast.error(describeError(t, err))
    }
  }

  const subtitle = [
    mode === 'owner' ? t.depositFrom.replace('{name}', d.from_name) : null,
    showLedger ? `${d.ledger_emoji} ${d.ledger_name}` : null,
    new Date(`${d.deposited_at}T00:00:00`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'numeric',
    }),
    d.note || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="flex flex-col gap-2 rounded-[14px] border-[1.5px] px-3 py-2.5"
      style={{ borderColor: theme.border, opacity: isPending ? 1 : 0.75 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="font-heading text-[16px] font-extrabold tabular-nums"
            style={{ color: theme.text }}
          >
            <MaskedAmount scope="year">{formatMoney(d.amount, d.currency, locale)}</MaskedAmount>
          </div>
          <div className="truncate text-[12px] font-semibold" style={{ color: theme.mutedText }}>
            {subtitle}
          </div>
        </div>
        <StatusPill status={d.status} />
      </div>

      {isPending && mode === 'owner' && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void reject()}
            className="min-h-11 flex-1 rounded-[12px] border-[1.5px] text-[13px] font-extrabold sm:min-h-9"
            style={{ borderColor: theme.dangerBorder, color: theme.danger }}
          >
            {t.depositReject}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void approve()}
            className="min-h-11 flex-[2] rounded-[12px] text-[13px] font-extrabold sm:min-h-9"
            style={{ background: theme.accentFill, color: theme.onAccent }}
          >
            ✓ {t.depositApprove}
          </button>
        </div>
      )}

      {isPending && mode === 'sender' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void withdraw()}
          className="min-h-11 self-start rounded-[12px] border-[1.5px] px-3 text-[13px] font-extrabold sm:min-h-8"
          style={{ borderColor: theme.border, color: theme.mutedText }}
        >
          {t.depositCancel}
        </button>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: LedgerDepositStatus }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const label = {
    pending: t.depositStatusPending,
    approved: t.depositStatusApproved,
    rejected: t.depositStatusRejected,
    cancelled: t.depositStatusCancelled,
  }[status]
  const color =
    status === 'approved'
      ? theme.income
      : status === 'pending'
        ? theme.warning
        : status === 'rejected'
          ? theme.danger
          : theme.mutedText
  return (
    <span
      className="flex-shrink-0 rounded-full border-[1.5px] px-2 py-0.5 text-[11px] font-extrabold"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  )
}
