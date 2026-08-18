import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ChevronUp, Eye, Minus, X } from 'lucide-react'

import { GradientButton } from '@/components/common/GradientButton'
import { useAuth } from '@/features/auth/AuthContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useTheme } from '../ThemeContext'
import type { CustomThemeRecord } from '../recipe/types'
import { hasBlockingIssue } from '../recipe/validate'
import { customThemeId, type ThemeTokens } from '../types'
import { AdvancedTab } from './tabs/AdvancedTab'
import { ArtTab } from './tabs/ArtTab'
import { BasicsTab } from './tabs/BasicsTab'
import { ColorsTab } from './tabs/ColorsTab'
import { DecorTab } from './tabs/DecorTab'
import { useStudioDraft, type StudioTab } from './useStudioDraft'

interface ThemeStudioPanelProps {
  /** The theme being edited, or null to create one. */
  record: CustomThemeRecord | null
  onClose: () => void
}

const TAB_KEYS: { id: StudioTab; labelKey: 'studioTabBasics' | 'studioTabColors' | 'studioTabDecor' | 'studioTabArt' | 'studioTabAdvanced' }[] = [
  { id: 'basics', labelKey: 'studioTabBasics' },
  { id: 'colors', labelKey: 'studioTabColors' },
  { id: 'decor', labelKey: 'studioTabDecor' },
  { id: 'art', labelKey: 'studioTabArt' },
  { id: 'advanced', labelKey: 'studioTabAdvanced' },
]

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
export function ThemeStudioPanel({ record, onClose }: ThemeStudioPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const { savedTheme, presetKey, setPreviewDef, setThemeId, saveCustomTheme, newCustomThemeId } =
    useTheme()

  const [tab, setTab] = useState<StudioTab>('basics')
  const [focusToken, setFocusToken] = useState<keyof ThemeTokens | null>(null)
  const [peeking, setPeeking] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [artBusy, setArtBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const draft = useStudioDraft({
    record,
    basePreset: presetKey,
    fallbackName: t.studioCreateTitle,
    newThemeId: newCustomThemeId,
    setPreviewDef,
  })
  const { state, issues } = draft

  const blocked = hasBlockingIssue(issues)
  const nameValid = state.name.trim().length > 0
  const canSave = !saving && !artBusy && !blocked && nameValid

  const close = () => {
    if (state.dirty && !window.confirm(t.studioDiscardConfirm)) return
    onClose()
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

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed right-4 bottom-4 z-[80] flex h-[52px] items-center gap-2 rounded-full border-[1.5px] px-4 text-[13px] font-extrabold shadow-lg md:top-[26px] md:right-[26px] md:bottom-auto"
        style={{
          background: savedTheme.panel,
          borderColor: savedTheme.borderStrong,
          color: savedTheme.text,
        }}
      >
        <ChevronUp className="size-4" />
        {t.studioExpand}
        {state.dirty && (
          <span className="size-2 rounded-full" style={{ background: savedTheme.accent }} />
        )}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      // Not modal, and it matters: the app behind stays interactive so the user can
      // scroll the grid to see what their change did.
      aria-modal="false"
      aria-label={record ? t.studioTitle : t.studioCreateTitle}
      className={cn(
        'fixed z-[80] flex flex-col overflow-hidden border-[1.5px] shadow-2xl transition-all duration-200',
        'inset-x-0 bottom-0 h-[56dvh] rounded-t-[26px]',
        'md:inset-x-auto md:top-[26px] md:right-[26px] md:bottom-[26px] md:h-auto md:w-[380px] md:rounded-[26px]',
        peeking && 'pointer-events-none translate-y-full opacity-0 md:translate-y-0 md:opacity-10',
      )}
      style={{
        background: savedTheme.panel,
        borderColor: savedTheme.borderStrong,
        color: savedTheme.text,
      }}
    >
      <header
        className="flex items-center gap-1.5 border-b px-3.5 py-2.5"
        style={{ borderColor: savedTheme.border }}
      >
        <span className="text-base leading-none">{state.icon}</span>
        <span className="font-heading min-w-0 flex-1 truncate text-[14px] font-extrabold">
          {state.name.trim() || t.studioCreateTitle}
        </span>
        {state.dirty && (
          <span
            className="rounded-full px-1.5 py-px text-[9px] font-extrabold"
            style={{ background: savedTheme.chip, color: savedTheme.muted }}
          >
            {t.studioUnsaved}
          </span>
        )}

        {isMobile && (
          <>
            {/* Hold-to-peek is the primary gesture on a phone: the sheet covers the
                bottom half of the grid, which is exactly where figures stand. */}
            <button
              type="button"
              aria-label={t.studioPeek}
              title={t.studioPeek}
              onPointerDown={() => setPeeking(true)}
              onPointerUp={() => setPeeking(false)}
              onPointerCancel={() => setPeeking(false)}
              onPointerLeave={() => setPeeking(false)}
              className="grid size-7 place-items-center rounded-lg"
              style={{ color: savedTheme.muted }}
            >
              <Eye className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t.studioMinimize}
              title={t.studioMinimize}
              onClick={() => setMinimized(true)}
              className="grid size-7 place-items-center rounded-lg"
              style={{ color: savedTheme.muted }}
            >
              <Minus className="size-4" />
            </button>
          </>
        )}

        <button
          type="button"
          aria-label={t.studioClose}
          title={t.studioClose}
          onClick={close}
          className="grid size-7 place-items-center rounded-lg"
          style={{ color: savedTheme.muted }}
        >
          <X className="size-4" />
        </button>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b px-2 py-1.5"
        style={{ borderColor: savedTheme.border }}
      >
        {TAB_KEYS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-current={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className="shrink-0 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-extrabold"
            style={{
              background: tab === entry.id ? savedTheme.accent : 'transparent',
              color: tab === entry.id ? '#ffffff' : savedTheme.muted,
            }}
          >
            {t[entry.labelKey]}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        {tab === 'basics' && <BasicsTab draft={draft} chrome={savedTheme} t={t} />}
        {tab === 'colors' && (
          <ColorsTab draft={draft} chrome={savedTheme} t={t} onEditToken={jumpToToken} />
        )}
        {tab === 'decor' && <DecorTab draft={draft} chrome={savedTheme} t={t} />}
        {tab === 'art' && user && (
          <ArtTab
            draft={draft}
            chrome={savedTheme}
            t={t}
            userId={user.id}
            onBusyChange={setArtBusy}
          />
        )}
        {tab === 'advanced' && (
          <AdvancedTab draft={draft} chrome={savedTheme} t={t} focusToken={focusToken} />
        )}
      </div>

      <IssueStrip draft={draft} chrome={savedTheme} onJump={jumpToToken} />

      <footer
        className="flex items-center gap-2 border-t px-3.5 py-2.5 max-md:pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
        style={{ borderColor: savedTheme.border }}
      >
        <button
          type="button"
          onClick={close}
          className="h-9 flex-1 rounded-[13px] border-[1.5px] text-[12.5px] font-extrabold"
          style={{ borderColor: savedTheme.border, color: savedTheme.text }}
        >
          {t.studioCancel}
        </button>
        <GradientButton
          onClick={() => void save()}
          disabled={!canSave}
          className="h-9 flex-1 text-[12.5px]"
        >
          {saving ? t.studioSaving : t.studioSave}
        </GradientButton>
      </footer>
    </div>
  )
}

/**
 * Readability warnings, pinned above the footer.
 *
 * A fixed strip rather than a toast: these are conditions, not events. A toast
 * that appears and drifts away while the user is dragging a slider is unreadable
 * by design, and the condition it announced is still true after it leaves.
 */
function IssueStrip({
  draft,
  chrome,
  onJump,
}: {
  draft: ReturnType<typeof useStudioDraft>
  chrome: ReturnType<typeof useTheme>['savedTheme']
  onJump: (token: keyof ThemeTokens) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { issues } = draft
  if (issues.length === 0) return null

  const worst = issues.some((issue) => issue.severity === 'error') ? '#ff5d7a' : '#f0a92e'

  return (
    <div className="border-t px-3.5 py-2" style={{ borderColor: chrome.border }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <AlertTriangle className="size-3.5 shrink-0" style={{ color: worst }} />
        <span className="flex-1 text-[11px] font-extrabold" style={{ color: worst }}>
          {issues.length}
        </span>
        <ChevronUp
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
          style={{ color: chrome.muted }}
        />
      </button>

      {open && (
        <ul className="mt-1.5 flex flex-col gap-1">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.token ?? index}`}>
              <button
                type="button"
                disabled={!issue.token}
                onClick={() => issue.token && onJump(issue.token)}
                className="text-left text-[10.5px] font-bold leading-snug"
                style={{ color: issue.severity === 'error' ? '#ff5d7a' : '#f0a92e' }}
              >
                {t[issue.code as keyof typeof t] as string}
                {issue.token ? ` · ${issue.token}` : ''} · {issue.ratio.toFixed(1)}:1
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
