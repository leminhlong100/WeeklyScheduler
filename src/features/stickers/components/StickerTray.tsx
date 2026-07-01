import { useState, type PointerEvent } from 'react'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { GradientButton } from '@/components/common/GradientButton'
import { STICKER_CATEGORIES, STICKER_TRAY_ITEMS } from '../data/stickerCatalog'
import type { StickerCategory, TrayItem } from '../types'
import { StickerVisual } from './StickerVisual'

interface StickerTrayProps {
  t: Dictionary
  theme: DerivedTheme
  open: boolean
  editMode: boolean
  onToggleOpen: () => void
  onToggleEditMode: () => void
  onItemPointerDown: (item: TrayItem, e: PointerEvent) => void
  onClearAll: () => void
}

const CATEGORY_LABEL_KEY: Record<StickerCategory, keyof Dictionary> = {
  love: 'stickerCatLove',
  nature: 'stickerCatNature',
  animals: 'stickerCatAnimals',
  food: 'stickerCatFood',
  objects: 'stickerCatObjects',
  shapes: 'stickerCatShapes',
}

export function StickerTray({
  t,
  theme,
  open,
  editMode,
  onToggleOpen,
  onToggleEditMode,
  onItemPointerDown,
  onClearAll,
}: StickerTrayProps) {
  const [category, setCategory] = useState<StickerCategory>(STICKER_CATEGORIES[0].id)
  const items = STICKER_TRAY_ITEMS.filter((item) => item.category === category)

  return (
    <div className="fixed right-[22px] bottom-[22px] z-[92] flex flex-col items-end gap-3">
      {open && (
        <div
          className="max-h-[58vh] w-[308px] overflow-auto rounded-[24px] border-[1.5px] p-[17px] shadow-2xl"
          style={{ background: theme.panel, borderColor: theme.border }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <div className="font-heading text-base font-extrabold" style={{ color: theme.text }}>
              {t.stickerTitle}
            </div>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-[10px] border-[1.5px] px-[11px] py-1 text-[11.5px] font-bold"
              style={{ borderColor: theme.border, color: theme.muted }}
            >
              {t.clearAll}
            </button>
          </div>
          <div className="mb-[13px] text-xs font-semibold" style={{ color: theme.muted }}>
            {t.dragHint}
          </div>
          <div className="mb-[11px] flex gap-[6px] overflow-x-auto pb-1">
            {STICKER_CATEGORIES.map((cat) => {
              const active = cat.id === category
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="flex shrink-0 items-center gap-1 rounded-full border-[1.5px] px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap"
                  style={{
                    borderColor: active ? theme.accent : theme.border,
                    background: active ? theme.accent : 'transparent',
                    color: active ? '#fff' : theme.muted,
                  }}
                >
                  <span className="text-[13px] leading-none">{cat.emoji}</span>
                  {t[CATEGORY_LABEL_KEY[cat.id]]}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-6 gap-[7px]">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={(e) => onItemPointerDown(item, e)}
                className="grid aspect-square touch-none place-items-center rounded-[13px] border-[1.5px] text-[22px]"
                style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
              >
                <StickerVisual item={item} size={26} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onToggleEditMode}
          className="flex h-14 items-center gap-2.5 rounded-[20px] border-[1.5px] px-[22px] text-[15px] font-extrabold shadow-lg"
          style={{
            borderColor: editMode ? theme.accent : theme.border,
            background: editMode ? theme.accent : theme.panel,
            color: editMode ? '#fff' : theme.text,
          }}
        >
          <span className="text-xl leading-none">✏️</span>
          {t.editStickers}
        </button>
        <GradientButton onClick={onToggleOpen} className="h-14 gap-2.5 rounded-[20px] px-[22px] text-[15px]">
          <span className="text-xl leading-none">🌈</span>
          {t.stickers}
        </GradientButton>
      </div>
    </div>
  )
}
