import { describe, expect, it } from 'vitest'
import { contrastRatio, flattenAlpha, isHex } from '@/lib/utils/color'
import { taskBoxStyle } from '@/features/tasks/utils/taskBoxStyle'
import { deriveTheme } from './deriveTheme'
import { listThemeDefinitions } from './themes'

const AA = 4.45
const stops = (css: string) => css.match(/#[0-9a-fA-F]{6}\b/g) ?? []
const worst = (fg: string, bgs: string[]) => Math.min(...bgs.map((bg) => contrastRatio(fg, bg)))

/**
 * Mọi cặp chữ/nền mà giao diện dùng phải đạt 4.5:1 ở mọi theme có sẵn. Trước khi
 * có các token này: chữ thanh bên của theme Chanh vàng 1.15:1, chữ trắng trên nút
 * của theme Matrix 1.34:1, chữ phụ 1.5:1.
 */
describe.each(listThemeDefinitions().map((d) => [d.key, d] as const))('theme %s', (_key, def) => {
  const theme = deriveTheme(def)
  const surfaces = [def.chip, def.mainBg, def.panel, def.modalBg].filter(isHex)

  it.each(['mutedText', 'income', 'warning', 'danger', 'accentText'] as const)(
    '%s ≥ 4.5:1 on every card surface',
    (token) => {
      expect(worst(theme[token], surfaces)).toBeGreaterThanOrEqual(AA)
    },
  )

  it('sidebar text and muted text ≥ 4.5:1 on the gradient and its cards', () => {
    const side = stops(def.sideGrad)
    const bgs = [...side, ...side.map((s) => flattenAlpha('#ffffff', 0.22, s))]
    expect(worst(theme.sidebarText, bgs)).toBeGreaterThanOrEqual(AA)
    expect(worst(theme.sidebarMuted, bgs)).toBeGreaterThanOrEqual(AA)
  })

  it('button text ≥ 4.5:1 on accent and gradient fills', () => {
    expect(contrastRatio(theme.onAccent, theme.accentFill)).toBeGreaterThanOrEqual(AA)
    expect(worst(theme.onBrand, stops(theme.brandGrad))).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(theme.onIncome, theme.income)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(theme.onDanger, theme.danger)).toBeGreaterThanOrEqual(AA)
  })

  it.each(['#ffd93d', '#ffb6c9', '#00e5ff', '#8b7be8', '#2fb58c', '#3a3a45'])(
    'task block text ≥ 4.5:1 for category colour %s',
    (color) => {
      for (const current of [false, true]) {
        const box = taskBoxStyle(color, theme, current)
        expect(contrastRatio(box.fg, box.bg)).toBeGreaterThanOrEqual(AA)
      }
    },
  )
})
