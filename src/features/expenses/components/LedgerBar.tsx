import { EyeIcon, PlusIcon, SettingsIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useLedgerSwitcher } from '../LedgerContext'

/**
 * Hàng chọn sổ ở đầu trang chi tiêu: "Cá nhân", các sổ mình tạo, và các sổ người
 * khác mời mình xem (có biểu tượng con mắt). Nút bánh răng mở cài đặt của sổ
 * đang chọn — chia sẻ, đổi tên, xoá với sổ của mình; rời sổ với sổ được mời.
 *
 * Chỉ có sổ cá nhân và chưa có sổ nào thì vẫn hiện, vì nút "+" là lối vào duy
 * nhất của tính năng.
 */
export function LedgerBar({
  onCreate,
  onOpenSettings,
}: {
  onCreate: () => void
  onOpenSettings: () => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { ledgerId, ledgers, info, selectLedger } = useLedgerSwitcher()

  const chips = [
    { id: null as string | null, emoji: '👤', label: t.ledgerPersonal, viewer: false },
    ...ledgers.map((l) => ({
      id: l.id as string | null,
      emoji: l.emoji,
      label: l.role === 'owner' ? l.name : `${l.name} · ${l.owner_name}`,
      viewer: l.role !== 'owner',
    })),
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="-my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
          {chips.map((chip) => {
            const active = chip.id === ledgerId
            return (
              <button
                key={chip.id ?? 'personal'}
                type="button"
                onClick={() => selectLedger(chip.id)}
                aria-pressed={active}
                className="flex max-w-[220px] flex-shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-extrabold transition-transform duration-150 active:scale-95"
                style={{
                  borderColor: active ? theme.accent : theme.border,
                  background: active ? theme.accentFill : theme.chip,
                  color: active ? theme.onAccent : theme.text,
                }}
              >
                <span className="text-sm leading-none">{chip.emoji}</span>
                <span className="truncate">{chip.label}</span>
                {chip.viewer && <EyeIcon className="size-3.5 flex-shrink-0 opacity-80" />}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onCreate}
          aria-label={t.ledgerNew}
          title={t.ledgerNew}
          className="grid size-8 flex-shrink-0 place-items-center rounded-full border-[1.5px] transition-transform duration-150 active:scale-95"
          style={{ borderColor: theme.border, background: theme.chip, color: theme.mutedText }}
        >
          <PlusIcon className="size-4" />
        </button>
        {info && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t.ledgerSettings}
            title={t.ledgerSettings}
            className="grid size-8 flex-shrink-0 place-items-center rounded-full border-[1.5px] transition-transform duration-150 active:scale-95"
            style={{ borderColor: theme.border, background: theme.chip, color: theme.mutedText }}
          >
            <SettingsIcon className="size-4" />
          </button>
        )}
      </div>

      {info && info.role !== 'owner' && (
        <div
          className="flex items-center gap-2 rounded-[14px] border-[1.5px] border-dashed px-3 py-2 text-[12.5px] font-bold"
          style={{ borderColor: theme.border, color: theme.mutedText }}
        >
          <EyeIcon className="size-4 flex-shrink-0" />
          <span>{t.ledgerViewOnly.replace('{name}', info.owner_name)}</span>
        </div>
      )}
    </div>
  )
}
