import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeOffIcon,
  PlusIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import type { Locale } from '@/features/i18n/types'
import { useTheme } from '@/features/theme/ThemeContext'

const LANGUAGES: Array<[Locale, string]> = [
  ['vi', 'Tiếng Việt'],
  ['en', 'English'],
  ['zh', '中文'],
  ['ja', '日本語'],
]

interface MoreTabProps {
  canEdit: boolean
  /** Sổ chia sẻ đang mở (null = cá nhân) — có thì hiện mục cài đặt sổ. */
  ledgerId: string | null
  onCreateLedger: () => void
  onLedgerSettings: () => void
  onCategories: () => void
  onHideOptions: () => void
  onExportCsv: () => void
}

/**
 * Mọi việc phụ, mỗi việc một dòng CÓ CHỮ. Thay cho hàng 5 nút chỉ có icon dưới
 * tab cũ — trên điện thoại không có hover để đọc `title`, nên người dùng không
 * biết nút nào làm gì.
 */
export function MoreTab({
  canEdit,
  ledgerId,
  onCreateLedger,
  onLedgerSettings,
  onCategories,
  onHideOptions,
  onExportCsv,
}: MoreTabProps) {
  const { t, locale, setLocale } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <Group title={t.moreLedgers}>
        <Row icon={PlusIcon} label={t.ledgerNew} onClick={onCreateLedger} />
        {ledgerId && (
          <Row icon={SettingsIcon} label={t.ledgerSettings} onClick={onLedgerSettings} />
        )}
      </Group>

      <Group title={t.moreSettings}>
        {canEdit && (
          <Row
            icon={SlidersHorizontalIcon}
            label={t.manageExpenseCategories}
            onClick={onCategories}
          />
        )}
        <Row icon={EyeOffIcon} label={t.hideCustomTitle} onClick={onHideOptions} />
        <Row icon={DownloadIcon} label={t.exportCsv} onClick={onExportCsv} />
        <Row icon={CalendarDaysIcon} label={t.moreGoScheduler} onClick={() => navigate('/')} />
      </Group>

      <Group title={t.moreLanguage}>
        <div className="grid grid-cols-2 gap-2 p-1">
          {LANGUAGES.map(([code, label]) => {
            const active = code === locale
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                aria-pressed={active}
                className="min-h-11 rounded-[12px] text-[14px] font-extrabold"
                style={{
                  background: active ? theme.accentFill : theme.inputBg,
                  color: active ? theme.onAccent : theme.text,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme()
  return (
    <section className="flex flex-col gap-1.5">
      <h2
        className="px-1 text-[12px] font-extrabold uppercase tracking-wider"
        style={{ color: theme.mutedText }}
      >
        {title}
      </h2>
      <div
        className="flex flex-col overflow-hidden rounded-[18px] border-[1.5px]"
        style={{ borderColor: theme.border, background: theme.chip }}
      >
        {children}
      </div>
    </section>
  )
}

function Row({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] items-center gap-3 border-b px-4 text-left text-[14.5px] font-bold last:border-b-0 active:opacity-70"
      style={{ borderColor: theme.border, color: theme.text }}
    >
      <Icon className="size-5 flex-shrink-0" style={{ color: theme.accentText }} />
      <span className="flex-1">{label}</span>
      <ChevronRightIcon className="size-4 flex-shrink-0" style={{ color: theme.mutedText }} />
    </button>
  )
}
