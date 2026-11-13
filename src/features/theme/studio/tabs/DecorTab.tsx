import { ToggleChipGroup } from '@/components/form/ToggleChipGroup'
import { DECOR_SHAPES, buildShapeSrc, type DecorShape } from '@/lib/utils/svgShapes'
import type { StudioTabProps } from '../types'

/**
 * Hình rải trên nền. Màu của chúng tự đi theo màu chính (chỉnh riêng ở "Nâng
 * cao"); tranh nền và nhân vật nằm ngay bên dưới trong cùng tab.
 */
export function DecorTab({ draft, chrome, t }: StudioTabProps) {
  const { state, dispatch } = draft
  const { recipe } = state
  const tint = recipe.decorColors[0] ?? recipe.accent

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-extrabold" style={{ color: chrome.mutedText }}>
        {t.studioShapes}
      </span>
      <p className="text-[12px] font-semibold leading-snug" style={{ color: chrome.mutedText }}>
        {t.studioShapesHint}
      </p>
      {/* Thứ tự vẫn có tác dụng (DecorBackground lặp danh sách theo chỉ số) nhưng
          không hiện số nữa: với người dùng nó chỉ là "chọn hình nào". */}
      <ToggleChipGroup<DecorShape>
        options={DECOR_SHAPES.map((shape) => ({
          value: shape,
          // `buildShapeSrc`, not `buildShapeDataUri` — the latter returns a CSS
          // `background` value with the `url()` wrapper already on it, which an
          // `<img src>` would try to fetch literally.
          label: <img src={buildShapeSrc(shape, tint)} alt={shape} className="size-6" />,
        }))}
        value={recipe.decor}
        onChange={(decor) => dispatch({ type: 'recipe', patch: { decor } })}
        colors={chrome}
        min={1}
        max={6}
        aria-label={t.studioShapes}
      />
    </div>
  )
}
