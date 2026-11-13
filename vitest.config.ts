import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Tách khỏi `vite.config.ts` cố ý: config chính nạp plugin PWA và mount Netlify
 * Function cho dev server, test hàm thuần không cần (và không nên kéo theo) mấy
 * thứ đó. Chỉ test hàm thuần — tiền, %, lọc — vì sai ở đó là sai số tiền.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
