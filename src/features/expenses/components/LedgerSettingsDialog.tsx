import { useConfirm } from '@/components/common/ConfirmDialog'
import { useState, type FormEvent } from 'react'
import {
  CopyIcon,
  LinkIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
  UserMinusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { describeError } from '@/lib/utils/errorMessage'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { buildInviteLink, type LedgerSummary } from '../api/ledgersApi'
import { useLedgerSwitcher } from '../LedgerContext'
import {
  useCreateLedger,
  useDeleteLedger,
  useLedgerMembers,
  useRemoveLedgerMember,
  useSetLedgerInvite,
  useUpdateLedger,
} from '../hooks/useLedgers'

const EMOJI_PRESETS = ['👛', '💰', '🏦', '👩', '💝', '🏠', '👶', '🎓']

/** `'new'` = tạo sổ mới; một id = cài đặt của sổ đó. */
export type LedgerDialogTarget = 'new' | string | null

export function LedgerSettingsDialog({
  target,
  onClose,
}: {
  target: LedgerDialogTarget
  onClose: () => void
}) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { ledgers } = useLedgerSwitcher()
  const ledger = target && target !== 'new' ? ledgers.find((l) => l.id === target) : undefined

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {target === 'new'
            ? t.ledgerCreateTitle
            : ledger?.role === 'owner'
              ? t.ledgerSettings
              : t.ledgerSharedWithMe}
        </DialogTitle>

        {target === 'new' && <LedgerForm onDone={onClose} />}
        {ledger?.role === 'owner' && (
          // Remount khi đổi sổ để form lấy lại tên/emoji của sổ mới.
          <OwnerSettings key={ledger.id} ledger={ledger} onDeleted={onClose} />
        )}
        {ledger && ledger.role !== 'owner' && <ViewerSettings ledger={ledger} onLeft={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ children }: { children: string }) {
  const { theme } = useTheme()
  return (
    <div
      className="text-[11px] font-extrabold uppercase tracking-wider"
      style={{ color: theme.mutedText }}
    >
      {children}
    </div>
  )
}

/** Tạo sổ mới (không có `ledger`) hoặc đổi tên/biểu tượng của sổ có sẵn. */
function LedgerForm({ ledger, onDone }: { ledger?: LedgerSummary; onDone?: () => void }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { selectLedger } = useLedgerSwitcher()
  const createLedger = useCreateLedger()
  const updateLedger = useUpdateLedger()
  const [name, setName] = useState(ledger?.name ?? '')
  const [emoji, setEmoji] = useState(ledger?.emoji ?? EMOJI_PRESETS[0])
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }
  const pending = createLedger.isPending || updateLedger.isPending
  const dirty = !ledger || name.trim() !== ledger.name || emoji !== ledger.emoji

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t.ledgerNameRequired)
      return
    }
    const safeEmoji = emoji.trim() || EMOJI_PRESETS[0]
    if (ledger) {
      updateLedger.mutate(
        { id: ledger.id, name: trimmed, emoji: safeEmoji },
        {
          onSuccess: () => toast.success(t.ledgerSaved),
          onError: (error) => toast.error(describeError(t, error)),
        },
      )
      return
    }
    createLedger.mutate(
      { name: trimmed, emoji: safeEmoji },
      {
        onSuccess: (created) => {
          selectLedger(created.id)
          toast.success(t.ledgerCreated)
          onDone?.()
        },
        onError: (error) => toast.error(describeError(t, error)),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {!ledger && (
        <p className="text-[12.5px] font-semibold" style={{ color: theme.mutedText }}>
          {t.ledgerCreateHint}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          aria-label={t.ledgerEmoji}
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={8}
          className="w-14 text-center text-lg"
          style={inputStyle}
        />
        <Input
          aria-label={t.ledgerName}
          placeholder={t.ledgerNamePh}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="flex-1"
          style={inputStyle}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setEmoji(preset)}
            className="grid size-9 place-items-center rounded-xl border-[1.5px] text-base"
            style={{
              borderColor: preset === emoji ? theme.accent : theme.border,
              background: theme.chip,
            }}
          >
            {preset}
          </button>
        ))}
      </div>
      <Button
        type="submit"
        disabled={pending || !dirty}
        style={{ background: theme.accent, color: '#fff' }}
      >
        {ledger ? t.save : t.ledgerCreate}
      </Button>
    </form>
  )
}

function OwnerSettings({ ledger, onDeleted }: { ledger: LedgerSummary; onDeleted: () => void }) {
  const confirm = useConfirm()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { selectLedger } = useLedgerSwitcher()
  const setInvite = useSetLedgerInvite()
  const deleteLedger = useDeleteLedger()
  const removeMember = useRemoveLedgerMember()
  const { data: members = [], isLoading: membersLoading } = useLedgerMembers(ledger.id)

  const link = ledger.invite_code ? buildInviteLink(ledger.invite_code) : null
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const outlineStyle = { background: 'transparent', borderColor: theme.border, color: theme.text }

  const toggleInvite = (enabled: boolean) => {
    setInvite.mutate(
      { ledgerId: ledger.id, enabled },
      { onError: (error) => toast.error(describeError(t, error)) },
    )
  }

  const handleRegenerate = async () => {
    if (
      !(await confirm({
        message: t.ledgerInviteRegenerateConfirm,
        confirmLabel: t.confirmRegenerate,
      }))
    )
      return
    toggleInvite(true)
  }

  const handleCopy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success(t.ledgerInviteCopied)
    } catch {
      // Trình duyệt chặn clipboard (http, iframe...): để người dùng tự chọn và
      // copy từ ô link, ô đó luôn hiện đủ link.
      toast.error(t.ledgerInviteCopyFailed)
    }
  }

  const handleShare = async () => {
    if (!link) return
    try {
      await navigator.share({ title: ledger.name, text: t.ledgerInviteShareText, url: link })
    } catch {
      // Người dùng đóng bảng chia sẻ — không phải lỗi.
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!(await confirm({ message: t.ledgerRemoveMemberConfirm, confirmLabel: t.confirmRemove })))
      return
    removeMember.mutate(
      { ledgerId: ledger.id, userId },
      {
        onSuccess: () => toast.success(t.ledgerMemberRemoved),
        onError: (error) => toast.error(describeError(t, error)),
      },
    )
  }

  const handleDelete = async () => {
    if (!(await confirm({ message: t.ledgerDeleteConfirm.replace('{name}', ledger.name) }))) return
    deleteLedger.mutate(ledger.id, {
      onSuccess: () => {
        selectLedger(null)
        toast.success(t.ledgerDeleted)
        onDeleted()
      },
      onError: (error) => toast.error(describeError(t, error)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <LedgerForm ledger={ledger} />

      <section className="flex flex-col gap-2.5">
        <SectionTitle>{t.ledgerShareTitle}</SectionTitle>
        <p className="text-[12.5px] font-semibold" style={{ color: theme.mutedText }}>
          {t.ledgerShareHint}
        </p>
        {link ? (
          <>
            <Input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="text-[12px]"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleCopy}
                className="gap-1.5"
                style={{ background: theme.accent, color: '#fff' }}
              >
                <CopyIcon className="size-4" />
                {t.ledgerInviteCopy}
              </Button>
              {canNativeShare && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  className="gap-1.5"
                  style={outlineStyle}
                >
                  <Share2Icon className="size-4" />
                  {t.ledgerInviteShare}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerate}
                disabled={setInvite.isPending}
                className="gap-1.5"
                style={outlineStyle}
              >
                <RefreshCwIcon className="size-4" />
                {t.ledgerInviteRegenerate}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleInvite(false)}
                disabled={setInvite.isPending}
                style={outlineStyle}
              >
                {t.ledgerInviteDisable}
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => toggleInvite(true)}
            disabled={setInvite.isPending}
            className="gap-1.5"
            style={{ background: theme.accent, color: '#fff' }}
          >
            <LinkIcon className="size-4" />
            {t.ledgerInviteEnable}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>{t.ledgerMembers}</SectionTitle>
        {!membersLoading && members.length === 0 && (
          <p className="text-[12.5px] font-semibold" style={{ color: theme.mutedText }}>
            {t.ledgerNoMembers}
          </p>
        )}
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2"
            style={{ borderColor: theme.border, background: theme.chip }}
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
              {member.display_name}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveMember(member.user_id)}
              aria-label={t.ledgerRemoveMember}
              title={t.ledgerRemoveMember}
              className="grid size-8 place-items-center rounded-lg"
              style={{ color: theme.mutedText }}
            >
              <UserMinusIcon className="size-4" />
            </button>
          </div>
        ))}
      </section>

      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={deleteLedger.isPending}
        className="gap-1.5"
        style={{ background: 'transparent', borderColor: '#d93a3a66', color: '#d93a3a' }}
      >
        <Trash2Icon className="size-4" />
        {t.ledgerDelete}
      </Button>
    </div>
  )
}

function ViewerSettings({ ledger, onLeft }: { ledger: LedgerSummary; onLeft: () => void }) {
  const confirm = useConfirm()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { user } = useAuth()
  const { selectLedger } = useLedgerSwitcher()
  const removeMember = useRemoveLedgerMember()

  const handleLeave = async () => {
    if (!(await confirm({ message: t.ledgerLeaveConfirm, confirmLabel: t.confirmLeave }))) return
    removeMember.mutate(
      { ledgerId: ledger.id, userId: user!.id },
      {
        onSuccess: () => {
          selectLedger(null)
          toast.success(t.ledgerLeft)
          onLeft()
        },
        onError: (error) => toast.error(describeError(t, error)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3"
        style={{ borderColor: theme.border, background: theme.chip }}
      >
        <span className="text-2xl">{ledger.emoji}</span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-extrabold">{ledger.name}</div>
          <div className="text-[12px] font-semibold" style={{ color: theme.mutedText }}>
            {t.ledgerViewOnly.replace('{name}', ledger.owner_name)}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleLeave}
        disabled={removeMember.isPending}
        style={{ background: 'transparent', borderColor: '#d93a3a66', color: '#d93a3a' }}
      >
        {t.ledgerLeave}
      </Button>
    </div>
  )
}
