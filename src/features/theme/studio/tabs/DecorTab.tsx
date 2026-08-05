import { Plus, X } from 'lucide-react'

import { ColorField } from '@/components/form/ColorField'
import { ToggleChipGroup } from '@/components/form/ToggleChipGroup'
import { DECOR_SHAPES, buildShapeDataUri, type DecorShape } from '@/lib/utils/svgShapes'
import { defaultDecorColors } from '../../recipe/buildTheme'
import type { StudioTabProps } from '../types'

const MAX_DECOR_COLORS = 4

export function DecorTab({ draft, chrome, t }: StudioTabProps) {
  const { state, dispatch } = draft
  const { recipe } = state
  const tint = recipe.decorColors[0] ?? recipe.accent

  const setColor = (index: number, hex: string) => {
    const decorColors = recipe.decorColors.slice()
    decorColors[index] = hex
    dispatch({ type: 'recipe', patch: { decorColors } })
  }

  const addColor = () => {
    if (recipe.decorColors.length >= MAX_DECOR_COLORS) return
    const suggestions = defaultDecorColors(
      recipe.accent,
      recipe.secondary,
      recipe.highlight,
      recipe.mode === 'dark',
    )
    dispatch({
      type: 'recipe',
      patch: {
        decorColors: [
          ...recipe.decorColors,
          suggestions[recipe.decorColors.length] ?? recipe.accent,
        ],
      },
    })
  }

  const removeColor = (index: number) => {
    if (recipe.decorColors.length <= 1) return
    dispatch({
      type: 'recipe',
      patch: { decorColors: recipe.decorColors.filter((_, i) => i !== index) },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {t.studioShapes}
        </span>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: chrome.muted }}>
          {t.studioShapesHint}
        </p>
        {/* Order is shown because it is real: DecorBackground cycles the shape list
            by index, so moving a shape changes the pattern, not just this list. */}
        <ToggleChipGroup<DecorShape>
          options={DECOR_SHAPES.map((shape) => ({
            value: shape,
            // Tinted with the actual first decor colour, so the tile previews what
            // will land on the background rather than a generic glyph.
            label: <img src={buildShapeDataUri(shape, tint)} alt={shape} className="size-6" />,
          }))}
          value={recipe.decor}
          onChange={(decor) => dispatch({ type: 'recipe', patch: { decor } })}
          colors={chrome}
          min={1}
          max={6}
          showOrder
          aria-label={t.studioShapes}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
            {t.studioDecorColors}
          </span>
          {recipe.decorColors.length < MAX_DECOR_COLORS && (
            <button
              type="button"
              onClick={addColor}
              className="grid size-5 place-items-center rounded-md"
              style={{ color: chrome.accent }}
              aria-label={t.studioDecorColors}
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        {recipe.decorColors.map((hex, index) => (
          <div key={index} className="flex items-end gap-1.5">
            <ColorField
              label={`${index + 1}`}
              value={hex}
              onChange={(next) => setColor(index, next)}
              colors={chrome}
              className="flex-1"
            />
            {recipe.decorColors.length > 1 && (
              <button
                type="button"
                onClick={() => removeColor(index)}
                aria-label={t.studioRemove}
                title={t.studioRemove}
                className="mb-1 grid size-6 place-items-center rounded-md"
                style={{ color: chrome.muted }}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* A control for this would be dead: DecorBackground hard-codes white for the
          sidebar variant. Saying so beats shipping a switch that does nothing. */}
      <p className="text-[10px] font-semibold leading-snug" style={{ color: chrome.muted }}>
        {t.studioSidebarShapeNote}
      </p>
    </div>
  )
}
