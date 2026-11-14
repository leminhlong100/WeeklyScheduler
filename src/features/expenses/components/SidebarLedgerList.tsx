import { EyeIcon, PlusIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useLedgerSwitcher } from '../LedgerContext'
import { usePendingDepositCounts } from '../hooks/useLedgerDeposits'

/**
 * Danh sách sổ ở sidebar trang chi tiêu — cùng dữ liệu với `LedgerBar`, nhưng
 * xếp dọc nên thấy hết tên sổ, không phải cuộn ngang. Trên mobile chọn xong thì
 * `onNavigate` đóng drawer.
 */
export function SidebarLedgerList({
  onCreate,
  onNavigate,
}: {
  onCreate: () => void
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const { ledgerId, ledgers, selectLedger } = useLedgerSwitcher()
  const { data: pendingCounts } = usePendingDepositCounts(ledgers.some((l) => l.role === 'owner'))

  const items = [
    {
      id: null as string | null,
      emoji: '👤',
      label: t.ledgerPersonal,
      sub: null as string | null,
      pending: 0,
    },
    ...ledgers.map((l) => ({
      id: l.id as string | null,
      emoji: l.emoji,
      label: l.name,
      sub: l.role === 'owner' ? null : l.owner_name,
      pending: pendingCounts?.get(l.id) ?? 0,
    })),
  ]

  return (
    <section>
      <div className="mb-2.5 text-[13px] font-extrabold text-(--side-fg)">{t.moreLedgers}</div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const active = item.id === ledgerId
          return (
            <button
              key={item.id ?? 'personal'}
              type="button"
              onClick={() => {
                selectLedger(item.id)
                onNavigate?.()
              }}
              aria-pressed={active}
              className="flex items-center gap-2.5 rounded-2xl border-none px-[11px] py-2.5 text-left transition-colors"
              style={{
                background: active ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.13)',
                color: active ? '#1f2937' : 'var(--side-fg)',
              }}
            >
              <span className="flex-shrink-0 text-base">{item.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">{item.label}</span>
                {item.sub && (
                  <span className="block truncate text-[11px] font-semibold opacity-75">
                    {item.sub}
                  </span>
                )}
              </span>
              {item.sub && <EyeIcon className="size-3.5 flex-shrink-0 opacity-75" />}
              {item.pending > 0 && (
                <span
                  aria-label={t.depositPendingBadge.replace('{n}', String(item.pending))}
                  title={t.depositPendingBadge.replace('{n}', String(item.pending))}
                  className="grid h-[18px] min-w-[18px] flex-shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[10.5px] font-extrabold text-white tabular-nums"
                >
                  {item.pending}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-2.5 flex items-center gap-1 text-xs font-bold text-(--side-fg) underline-offset-2 hover:underline"
      >
        <PlusIcon className="size-3.5" />
        {t.ledgerNew}
      </button>
    </section>
  )
}
