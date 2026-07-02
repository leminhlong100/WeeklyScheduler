import { useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { toast } from 'sonner'
import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '@/features/theme/types'
import { GradientButton } from '@/components/common/GradientButton'
import { STICKER_CATEGORIES, STICKER_TRAY_ITEMS } from '../data/stickerCatalog'
import type { StickerCategory, TrayImageItem, TrayItem } from '../types'
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
  customItems: TrayImageItem[]
  onAddCustom: (file: File) => Promise<boolean>
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

export function StickerTray({
  t,
  theme,
  open,
  editMode,
  onToggleOpen,
  onToggleEditMode,
  onItemPointerDown,
  onClearAll,
  customItems,
  onAddCustom,
  onRemoveCustom,
}: StickerTrayProps) {
  const [category, setCategory] = useState<StickerCategory>(STICKER_CATEGORIES[0].id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const items = category === 'custom' ? customItems : STICKER_TRAY_ITEMS.filter((item) => item.category === category)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ok = await onAddCustom(file)
    if (!ok) toast.error(t.somethingWentWrong)
  }

  return (
    <div className="fixed right-[22px] bottom-[22px] z-[92] flex flex-col items-end gap-2.5">
      {open && (
        <div
          className="flex h-[68vh] w-[264px] flex-col overflow-hidden rounded-[20px] border-[1.5px] p-[14px] shadow-2xl"
          style={{ background: theme.panel, borderColor: theme.border }}
        >
          <div className="mb-1.5 flex shrink-0 items-center justify-between">
            <div className="font-heading text-[15px] font-extrabold" style={{ color: theme.text }}>
              {t.stickerTitle}
            </div>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-[10px] border-[1.5px] px-[10px] py-1 text-[11px] font-bold"
              style={{ borderColor: theme.border, color: theme.muted }}
            >
              {t.clearAll}
            </button>
          </div>
          <div className="mb-[11px] shrink-0 text-[11px] font-semibold" style={{ color: theme.muted }}>
            {t.dragHint}
          </div>
          <div className="mb-[10px] flex shrink-0 gap-[6px] overflow-x-auto pb-1">
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
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-4 gap-[7px]">
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
            {category === 'custom' && customItems.length === 0 && (
              <div className="mt-2 text-xs font-semibold" style={{ color: theme.muted }}>
                {t.addCustomSticker}
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleEditMode}
          className="flex h-10 items-center gap-1.5 rounded-2xl border-[1.5px] px-[15px] text-[12.5px] font-extrabold shadow-lg"
          style={{
            borderColor: editMode ? theme.accent : theme.border,
            background: editMode ? theme.accent : theme.panel,
            color: editMode ? '#fff' : theme.text,
          }}
        >
          <span className="text-[15px] leading-none">✏️</span>
          {t.editStickers}
        </button>
        <GradientButton onClick={onToggleOpen} className="h-10 gap-1.5 rounded-2xl px-[15px] text-[12.5px]">
          <span className="text-[15px] leading-none">🌈</span>
          {t.stickers}
        </GradientButton>
      </div>
    </div>
  )
}
