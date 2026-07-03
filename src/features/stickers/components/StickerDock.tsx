import { useRef, type ChangeEvent, type PointerEvent } from 'react'
import { XIcon } from 'lucide-react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { STICKER_CATEGORIES, STICKER_TRAY_ITEMS } from '../data/stickerCatalog'
import type { StickerCategory, TrayImageItem, TrayItem } from '../types'
import { StickerVisual } from './StickerVisual'

interface StickerDockProps {
  t: Dictionary
  theme: DerivedTheme
  category: StickerCategory
  onCategoryChange: (category: StickerCategory) => void
  onClose: () => void
  onItemPointerDown: (item: TrayItem, e: PointerEvent) => void
  onClearAll: () => void
  customItems: TrayImageItem[]
  isSyncingCustom: boolean
  onAddCustom: (files: File[]) => Promise<{ added: number; failed: number }>
  onRemoveCustom: (id: string) => void
}

const CATEGORY_LABEL_KEY: Record<StickerCategory, keyof Dictionary> = {
  love: 'stickerCatLove',
  nature: 'stickerCatNature',
  animals: 'stickerCatAnimals',
  food: 'stickerCatFood',
  objects: 'stickerCatObjects',
  shapes: 'stickerCatShapes',
  custom: 'stickerCatCustom',
}

/**
 * Floating sticker library card, anchored above the tray toggle buttons at
 * the screen's right edge — it sits outside the calendar on the page
 * background, it never resizes or covers the schedule grid. Categories run
 * down a vertical rail on the left instead of a horizontal scroller.
 */
export function StickerDock({
  t,
  theme,
  category,
  onCategoryChange,
  onClose,
  onItemPointerDown,
  onClearAll,
  customItems,
  isSyncingCustom,
  onAddCustom,
  onRemoveCustom,
}: StickerDockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const items = category === 'custom' ? customItems : STICKER_TRAY_ITEMS.filter((item) => item.category === category)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    await onAddCustom(files)
  }

  return (
    <div
      className="flex h-[60vh] w-[calc(100vw-24px)] max-w-[300px] flex-col overflow-hidden rounded-[20px] border-[1.5px] p-[14px] shadow-2xl sm:h-[68vh]"
      style={{ background: theme.panel, borderColor: theme.border }}
    >
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
        <div className="font-heading text-[15px] font-extrabold" style={{ color: theme.text }}>
          {t.stickerTitle}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-[10px] border-[1.5px] px-[10px] py-1 text-[11px] font-bold"
            style={{ borderColor: theme.border, color: theme.muted }}
          >
            {t.clearAll}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
            style={{ background: theme.chip, color: theme.muted }}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="mb-[11px] shrink-0 text-[11px] font-semibold" style={{ color: theme.muted }}>
        {t.dragHint}
      </div>
      <div className="flex min-h-0 flex-1 gap-[10px]">
        <div className="flex w-[62px] shrink-0 flex-col gap-[5px] overflow-y-auto pr-0.5">
          {STICKER_CATEGORIES.map((cat) => {
            const active = cat.id === category
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-[12px] border-[1.5px] py-[7px] text-center"
                style={{
                  borderColor: active ? theme.accent : 'transparent',
                  background: active ? theme.accent : theme.chip,
                  color: active ? '#fff' : theme.muted,
                }}
              >
                <span className="text-[16px] leading-none">{cat.emoji}</span>
                <span className="text-[9px] leading-tight font-bold">{t[CATEGORY_LABEL_KEY[cat.id]]}</span>
              </button>
            )
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-[7px]">
            {category === 'custom' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t.addCustomSticker}
                className="grid aspect-square touch-none place-items-center rounded-[13px] border-[1.5px] border-dashed text-[20px]"
                style={{ borderColor: theme.border, background: theme.chip, color: theme.muted }}
              >
                +
              </button>
            )}
            {items.map((item, i) => (
              <div key={category === 'custom' ? (item as TrayImageItem).id : i} className="relative">
                <button
                  type="button"
                  onPointerDown={(e) => onItemPointerDown(item, e)}
                  className="grid aspect-square w-full touch-none place-items-center rounded-[13px] border-[1.5px] text-[22px]"
                  style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
                >
                  <StickerVisual item={item} size={26} />
                </button>
                {category === 'custom' && (
                  <button
                    type="button"
                    onClick={() => onRemoveCustom((item as TrayImageItem).id)}
                    title={t.delete}
                    className="absolute -top-[6px] -right-[6px] grid h-[17px] w-[17px] place-items-center rounded-full bg-[#ff5d7a] text-[10px] leading-none text-white shadow-md"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {category === 'custom' && customItems.length === 0 && !isSyncingCustom && (
            <div className="mt-2 text-xs font-semibold" style={{ color: theme.muted }}>
              {t.addCustomSticker}
            </div>
          )}
          {category === 'custom' && isSyncingCustom && (
            <div className="mt-2 text-xs font-semibold" style={{ color: theme.muted }}>
              {t.stickerSyncing}
            </div>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
    </div>
  )
}
