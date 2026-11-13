import { useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { AlertTriangle, ChevronUp, Eye, X } from 'lucide-react'

import { useConfirm } from '@/components/common/ConfirmDialog'
import { GradientButton } from '@/components/common/GradientButton'
import { useAuth } from '@/features/auth/AuthContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { StudioTarget } from '../components/ThemeUiProvider'
import { useTheme } from '../ThemeContext'
import { hasBlockingIssue, type ThemeIssue } from '../recipe/validate'
import { customThemeId, type DerivedTheme, type ThemeTokens } from '../types'
import { AdvancedTab } from './tabs/AdvancedTab'
import { ArtTab } from './tabs/ArtTab'
import { ColorsTab } from './tabs/ColorsTab'
import { DecorTab } from './tabs/DecorTab'
import { useStudioDraft, type StudioDraft, type StudioTab } from './useStudioDraft'

interface ThemeStudioPanelProps {
  target: StudioTarget
  onClose: () => void
}

const TAB_KEYS: { id: StudioTab; labelKey: 'studioTabColors' | 'studioTabDecor' | 'studioTabAdvanced' }[] = [
  { id: 'colors', labelKey: 'studioTabColors' },
  { id: 'decor', labelKey: 'studioTabDecor' },
  { id: 'advanced', labelKey: 'studioTabAdvanced' },
]

/** Dưới mức này Studio là sheet dưới đáy: dock 380px bên phải che hết lưới ở 768px. */
const COMPACT_QUERY = '(max-width: 1023px)'

/**
 * The theme builder.
 *
 * A fixed dock, deliberately **not** a Dialog. `DialogOverlay` paints
 * `bg-black/10 backdrop-blur-xs`, which would obscure the very thing being
 * edited. And a shrunken in-panel preview would lie: `DecorBackground` uses fixed
 * pixel sizes and `ThemeArtLayer` anchors figures in px, so neither scales
 * truthfully — and those are exactly the two things this panel builds. So the
 * draft is applied to the real app and the panel simply sits beside it.
 *
 * Mount conditionally: unmounting is what clears the live preview.
 */
export function ThemeStudioPanel(props: ThemeStudioPanelProps) {
  // Portaled to <body>: rendered inside AppShell's content well (a z-50 stacking
  // context) its z-[80] is capped at 50, so the z-60 mobile action bar painted
  // over the footer and hid the Save button.
  return createPortal(<ThemeStudioPanelBody {...props} />, document.body)
}

function ThemeStudioPanelBody({ target, onClose }: ThemeStudioPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const confirm = useConfirm()
  const compact = useMediaQuery(COMPACT_QUERY)
  const { savedTheme, presetKey, setPreviewDef, setThemeId, saveCustomTheme, newCustomThemeId } =
    useTheme()

  const [tab, setTab] = useState<StudioTab>('colors')
  const [focusToken, setFocusToken] = useState<keyof ThemeTokens | null>(null)
  /** "Xem trước": panel thu về một nút nhỏ để thấy trọn app. */
  const [previewing, setPreviewing] = useState(false)
  const [artBusy, setArtBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const draft = useStudioDraft({
    record: target.record,
    basePreset: target.record ? target.record.recipe.basePreset : (target.basePreset ?? presetKey),
    fallbackName: t.studioCreateTitle,
    newThemeId: newCustomThemeId,
    setPreviewDef,
  })
  const { state, issues } = draft

  const blocked = hasBlockingIssue(issues)
  const nameValid = state.name.trim().length > 0
  const canSave = !saving && !artBusy && !blocked && nameValid

  /** Resolves true when the studio actually closed. */
  const requestClose = async (): Promise<boolean> => {
    if (
      state.dirty &&
      !(await confirm({ message: t.studioDiscardConfirm, confirmLabel: t.studioDiscard }))
    ) {
      return false
    }
    onClose()
    return true
  }

  // Back của điện thoại = Huỷ. Mục lịch sử của lớp đã bị Back lấy đi; nếu người
  // dùng chọn ở lại thì gắn lại một mục mới, để Back lần sau vẫn hỏi.
  const [backArmed, setBackArmed] = useState(true)
  useBackToClose(backArmed, () => {
    setBackArmed(false)
    void requestClose().then((closed) => {
      if (!closed) setBackArmed(true)
    })
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Chỉ khi focus nằm trong panel: hộp cắt ảnh là portal nhưng sự kiện React vẫn
    // nổi bọt qua đây, Esc của nó không được đóng cả Studio.
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (!panelRef.current?.contains(event.target as Node)) return
    event.preventDefault()
    void requestClose()
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const saved = await saveCustomTheme({
        id: state.id,
        isNew: state.isNew,
        name: state.name.trim(),
        icon: state.icon,
        recipe: state.recipe,
        overrides: state.overrides,
        art: state.art,
      })
      if (!saved) {
        toast.error(t.themeSaveFailed)
        return
      }
      // Select it before closing: unmounting clears the preview, and without the
      // selection the app would snap back to the preset the user started from.
      setThemeId(customThemeId(saved.id))
      onClose()
    } catch {
      toast.error(t.themeSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  const jumpToToken = (token: keyof ThemeTokens) => {
    setFocusToken(token)
    setTab('advanced')
  }

  if (previewing) {
    return (
      <button
        type="button"
        onClick={() => setPreviewing(false)}
        // Điện thoại: nằm TRÊN thanh dưới (72px) chứ không đè lên nút ＋ và ⋯.
        className="fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[80] flex h-12 items-center gap-2 rounded-full border-[1.5px] px-5 text-[14px] font-extrabold shadow-lg lg:top-[26px] lg:right-[26px] lg:bottom-auto"
        style={{ background: savedTheme.panel, borderColor: savedTheme.borderStrong, color: savedTheme.text }}
      >
        <ChevronUp className="size-4" />
        {t.studioExpand}
        {state.dirty && (
          <span className="size-2 rounded-full" style={{ background: savedTheme.accentText }} />
        )}
      </button>
    )
  }

  const iconButton = 'grid size-11 shrink-0 place-items-center rounded-xl lg:size-9'

  return (
    <div
      ref={panelRef}
      role="dialog"
      // Not modal, and it matters: the app behind stays interactive so the user can
      // scroll the grid to see what their change did.
      aria-modal="false"
      aria-label={target.record ? t.studioTitle : t.studioCreateTitle}
      onKeyDown={onKeyDown}
      className={cn(
        'fixed z-[80] flex flex-col overflow-hidden border-[1.5px] shadow-2xl',
        'inset-x-0 bottom-0 h-[60dvh] rounded-t-[26px]',
        'lg:inset-x-auto lg:top-[26px] lg:right-[26px] lg:bottom-[26px] lg:h-auto lg:w-[380px] lg:rounded-[26px]',
      )}
      style={{ background: savedTheme.panel, borderColor: savedTheme.borderStrong, color: savedTheme.text }}
    >
      <header
        className="flex items-center gap-1 border-b py-1 pr-1.5 pl-3.5"
        style={{ borderColor: savedTheme.border }}
      >
        <span className="text-base leading-none">{state.icon}</span>
        <span className="font-heading ml-1 min-w-0 flex-1 truncate text-[15px] font-extrabold">
          {state.name.trim() || t.studioCreateTitle}
        </span>
        {state.dirty && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
            style={{ background: savedTheme.chip, color: savedTheme.mutedText }}
          >
            {t.studioUnsaved}
          </span>
        )}

        {compact && (
          // Trên khổ hẹp panel che nửa dưới app — đúng chỗ có lưới và nhân vật.
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-extrabold"
            style={{ color: savedTheme.accentText }}
          >
            <Eye className="size-4" />
            {t.studioPeek}
          </button>
        )}

        <button
          type="button"
          aria-label={t.studioClose}
          title={t.studioClose}
          onClick={() => void requestClose()}
          className={iconButton}
          style={{ color: savedTheme.mutedText }}
        >
          <X className="size-5" />
        </button>
      </header>

      <nav
        role="tablist"
        className="flex gap-1 border-b px-2 py-1.5"
        style={{ borderColor: savedTheme.border }}
      >
        {TAB_KEYS.map((entry) => {
          const active = tab === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.id)}
              className="min-h-11 flex-1 rounded-[12px] px-2 text-[13px] font-extrabold lg:min-h-9"
              style={{
                background: active ? savedTheme.accentFill : 'transparent',
                color: active ? savedTheme.onAccent : savedTheme.mutedText,
              }}
            >
              {t[entry.labelKey]}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5" role="tabpanel">
        {tab === 'colors' && <ColorsTab draft={draft} chrome={savedTheme} t={t} />}
        {tab === 'decor' && (
          <div className="flex flex-col gap-5">
            <DecorTab draft={draft} chrome={savedTheme} t={t} />
            {user && (
              <ArtTab
                draft={draft}
                chrome={savedTheme}
                t={t}
                userId={user.id}
                onBusyChange={setArtBusy}
              />
            )}
          </div>
        )}
        {tab === 'advanced' && (
          <AdvancedTab draft={draft} chrome={savedTheme} t={t} focusToken={focusToken} />
        )}
      </div>

      <IssueStrip draft={draft} chrome={savedTheme} onJump={jumpToToken} />

      <footer
        className="flex items-center gap-2 border-t px-3.5 py-2.5 max-lg:pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
        style={{ borderColor: savedTheme.border }}
      >
        <button
          type="button"
          onClick={() => void requestClose()}
          className="h-11 flex-1 rounded-[13px] border-[1.5px] text-[14px] font-extrabold lg:h-10"
          style={{ borderColor: savedTheme.border, color: savedTheme.text }}
        >
          {t.studioCancel}
        </button>
        <GradientButton
          onClick={() => void save()}
          disabled={!canSave}
          title={blocked ? t.studioSaveBlocked : undefined}
          className="h-11 flex-1 text-[14px] lg:h-10"
        >
          {saving ? t.studioSaving : t.studioSave}
        </GradientButton>
      </footer>
    </div>
  )
}

/** Mọi bề mặt mà chữ chính phải đọc được — một lỗi màu chữ thường hỏng cả loạt. */
const TEXT_SURFACE_TOKENS: (keyof ThemeTokens)[] = ['text', 'panel', 'modalBg', 'mainBg', 'inputBg', 'appBg', 'chip']

/**
 * Readability warnings, pinned above the footer.
 *
 * A fixed strip rather than a toast: these are conditions, not events. A toast
 * that appears and drifts away while the user is dragging a slider is unreadable
 * by design, and the condition it announced is still true after it leaves.
 *
 * Nói bằng lời và có nút sửa: một màu chữ sai từng sinh sáu dòng "panel 1.4:1,
 * modalBg 1.4:1…" giống hệt nhau, trên một thanh chỉ ghi "⚠ 6".
 */
function IssueStrip({
  draft,
  chrome,
  onJump,
}: {
  draft: StudioDraft
  chrome: DerivedTheme
  onJump: (token: keyof ThemeTokens) => void
}) {
  const { t } = useTranslation()
  const { issues, state, dispatch } = draft
  if (issues.length === 0) return null

  // Gộp mọi lỗi "chữ trên bề mặt" thành một dòng.
  const textIssues = issues.filter((issue) => issue.code === 'themeIssueTextSurface')
  const rows: { key: string; issue: ThemeIssue; fix?: () => void; jump?: keyof ThemeTokens }[] = []
  if (textIssues.length) {
    rows.push({
      key: 'text',
      issue: textIssues[0],
      // Màu suy ra luôn đạt chuẩn, nên bỏ các màu sửa tay liên quan là đủ.
      fix: () => {
        for (const token of TEXT_SURFACE_TOKENS) {
          if (state.overrides[token] !== undefined) dispatch({ type: 'clearOverride', token })
        }
      },
      jump: 'text',
    })
  }
  for (const issue of issues) {
    if (issue.code === 'themeIssueTextSurface') continue
    if (issue.code === 'themeIssueScene' && issue.suggestedOpacity !== undefined) {
      const opacity = issue.suggestedOpacity
      rows.push({ key: issue.code, issue, fix: () => dispatch({ type: 'art', patch: { sceneOpacity: opacity } }) })
    } else if (issue.token && state.overrides[issue.token] !== undefined) {
      const token = issue.token
      rows.push({ key: issue.code, issue, fix: () => dispatch({ type: 'clearOverride', token }), jump: token })
    } else {
      rows.push({ key: issue.code, issue, jump: issue.token })
    }
  }

  const blocked = hasBlockingIssue(issues)
  const color = blocked ? chrome.danger : chrome.warning

  return (
    <div className="flex flex-col gap-1.5 border-t px-3.5 py-2" style={{ borderColor: chrome.border }}>
      <div className="flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color }}>
        <AlertTriangle className="size-4 shrink-0" />
        {t.studioIssuesCount.replace('{n}', String(rows.length))}
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map(({ key, issue, fix, jump }) => (
          <li key={key} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!jump}
              onClick={() => jump && onJump(jump)}
              title={`${issue.ratio.toFixed(1)}:1`}
              className="min-w-0 flex-1 text-left text-[12px] font-bold leading-snug"
              style={{ color: chrome.text }}
            >
              {t[issue.code as keyof typeof t] as string}
            </button>
            {fix && (
              <button
                type="button"
                onClick={fix}
                className="min-h-9 shrink-0 rounded-full px-3 text-[12px] font-extrabold"
                style={{ background: chrome.accentFill, color: chrome.onAccent }}
              >
                {issue.code === 'themeIssueScene' && issue.suggestedOpacity !== undefined
                  ? t.studioUseOpacity.replace('{n}', String(Math.round(issue.suggestedOpacity * 100)))
                  : t.studioFixAuto}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
