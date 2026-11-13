import { describe, expect, it } from 'vitest'
import { contrastRatio, isHex } from '@/lib/utils/color'
import { deriveTheme } from './deriveTheme'
import { listThemeDefinitions } from './themes'

/**
 * Chữ phụ, màu thu, cảnh báo và lỗi phải đọc được trên mọi nền thẻ của mọi
 * theme có sẵn. Trước khi có token này, chữ phụ của theme Chanh vàng chỉ 1.5:1.
 */
describe.each(listThemeDefinitions().map((d) => [d.key, d] as const))('theme %s', (_key, def) => {
  const theme = deriveTheme(def)
  const surfaces = [def.chip, def.mainBg, def.panel, def.modalBg].filter(isHex)
  it.each(['mutedText', 'income', 'warning', 'danger'] as const)('%s ≥ 4.5:1', (token) => {
    for (const bg of surfaces) {
      expect(contrastRatio(theme[token], bg)).toBeGreaterThanOrEqual(4.45)
    }
  })
})
